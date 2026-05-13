import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import uuid

from database import get_db_connection
from core import dependencies

logger = logging.getLogger("swag")

router = APIRouter(prefix="/api", tags=["swag", "redeem"])


# ── Swag Items ────────────────────────────────────────────────

@router.get("/swag")
def list_swag_items(conn=Depends(get_db_connection)):
    """List all active swag items (public)."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM swag_items WHERE active = TRUE ORDER BY points_cost ASC")
    return cursor.fetchall()


@router.post("/admin/swag")
def create_swag_item(
    item: dict,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO swag_items (name, description, points_cost, image_url, active)
           VALUES (%s, %s, %s, %s, TRUE) RETURNING *""",
        (item["name"], item.get("description", ""), item["points_cost"], item.get("image_url", "")),
    )
    new_item = cursor.fetchone()
    conn.commit()
    return new_item


# ── Settings ──────────────────────────────────────────────────

class SettingUpdate(BaseModel):
    value: str


@router.put("/admin/settings/{key}")
def update_setting(
    key: str,
    body: SettingUpdate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Update a system setting (e.g. commission_enabled)."""
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO system_settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = %s RETURNING *",
        (key, body.value, body.value),
    )
    result = cursor.fetchone()
    conn.commit()
    logger.info(f"Admin {current_user['email']} updated setting {key} = {body.value}")
    return result


# ── Redemption ────────────────────────────────────────────────

class RedeemRequest(BaseModel):
    item_id: Optional[str] = None  # For points redemption (swag item)
    wallet: str  # "points" or "commission"
    address: str
    amount: Optional[float] = None  # For commission redemption


@router.post("/redeem")
def create_redemption(
    body: RedeemRequest,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Create a redemption order."""
    cursor = conn.cursor()
    user_id = str(current_user["id"])

    if body.wallet == "points":
        if not body.item_id:
            raise HTTPException(status_code=400, detail="item_id required for points redemption")

        # Check swag item exists
        cursor.execute("SELECT * FROM swag_items WHERE id = %s AND active = TRUE", (body.item_id,))
        item = cursor.fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Swag item not found")

        # Check points balance (Earnings - Fulfilled) - Pending Orders
        cursor.execute(
            """SELECT (
                (SELECT COALESCE(SUM(CASE WHEN type='earn' THEN amount ELSE -amount END), 0) FROM points_transactions WHERE ambassador_id = %s) -
                (SELECT COALESCE(SUM(si.points_cost), 0) FROM redemption_orders ro JOIN swag_items si ON ro.item_id = si.id WHERE ro.ambassador_id = %s AND ro.status = 'pending')
            ) as balance""",
            (user_id, user_id),
        )
        balance = cursor.fetchone()["balance"]
        if balance < item["points_cost"]:
            raise HTTPException(status_code=400, detail=f"Not enough points. You have {balance}, need {item['points_cost']}")

        # No transaction created here; balance is handled by dashboard stats pending logic
        cursor.execute(
            """INSERT INTO redemption_orders (ambassador_id, item_id, wallet, status, address, amount)
               VALUES (%s, %s, 'points', 'pending', %s, %s) RETURNING *""",
            (user_id, body.item_id, body.address, item["points_cost"]),
        )

    elif body.wallet == "commission":
        # Check commission is enabled
        cursor.execute("SELECT value FROM system_settings WHERE key = 'commission_enabled'")
        setting = cursor.fetchone()
        if not setting or setting["value"] != "true":
            raise HTTPException(status_code=403, detail="Commission system is currently disabled")

        if not body.amount or body.amount <= 0:
            raise HTTPException(status_code=400, detail="A positive amount is required for commission redemption")

        # Check commission balance (Earnings - Fulfilled) - Pending Orders
        cursor.execute(
            """SELECT (
                (SELECT COALESCE(SUM(CASE WHEN type='earn' THEN amount ELSE -amount END), 0) FROM commission_transactions WHERE ambassador_id = %s) -
                (SELECT COALESCE(SUM(amount), 0) FROM redemption_orders WHERE ambassador_id = %s AND wallet = 'commission' AND status = 'pending')
            ) as balance""",
            (user_id, user_id),
        )
        balance = float(cursor.fetchone()["balance"])
        if balance < body.amount:
            raise HTTPException(status_code=400, detail=f"Not enough commission. You have ${balance:.2f}, requested ${body.amount:.2f}")

        # No transaction created here; balance is handled by dashboard stats pending logic
        cursor.execute(
            """INSERT INTO redemption_orders (ambassador_id, item_id, wallet, status, address, amount)
               VALUES (%s, NULL, 'commission', 'pending', %s, %s) RETURNING *""",
            (user_id, body.address, body.amount),
        )
    else:
        raise HTTPException(status_code=400, detail="wallet must be 'points' or 'commission'")

    order = cursor.fetchone()
    
    from core.notifications import create_notification
    # Notify Admin (any admin)
    cursor.execute("SELECT id FROM users WHERE role = 'admin'")
    admins = cursor.fetchall()
    for admin in admins:
        create_notification(conn, str(admin["id"]), "New Redemption Request", f"User {current_user['name']} requested a {body.wallet} redemption.", "redemption")

    conn.commit()
    logger.info(f"Redemption created by {current_user['email']}: wallet={body.wallet}, order={order['id']}")
    return order


@router.get("/redeem")
def list_my_redemptions(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """List redemption orders for the current user."""
    cursor = conn.cursor()
    if current_user["role"] == "admin":
        cursor.execute(
            """SELECT ro.*, si.name as item_name, u.name as user_name, u.email as user_email
               FROM redemption_orders ro
               LEFT JOIN swag_items si ON ro.item_id = si.id
               LEFT JOIN users u ON ro.ambassador_id = u.id
               ORDER BY ro.created_at DESC"""
        )
    else:
        cursor.execute(
            """SELECT ro.*, si.name as item_name, si.points_cost
               FROM redemption_orders ro
               LEFT JOIN swag_items si ON ro.item_id = si.id
               WHERE ro.ambassador_id = %s
               ORDER BY ro.created_at DESC""",
            (str(current_user["id"]),),
        )
    return cursor.fetchall()


@router.delete("/redeem/{order_id}")
def cancel_order(
    order_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Cancel a pending redemption order and refund the balance."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM redemption_orders WHERE id = %s AND ambassador_id = %s AND status = 'pending'",
        (str(order_id), str(current_user["id"])),
    )
    order = cursor.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Pending order not found or does not belong to you")

    # Update status
    cursor.execute(
        "UPDATE redemption_orders SET status = 'rejected' WHERE id = %s",
        (str(order_id),),
    )

    # Refund
    if order["wallet"] == "commission" and order["amount"] is not None:
        cursor.execute(
            "INSERT INTO commission_transactions (ambassador_id, amount, type) VALUES (%s, %s, 'earn')",
            (order["ambassador_id"], order["amount"]),
        )
    elif order["wallet"] == "points" and order["amount"] is not None:
        cursor.execute(
            "INSERT INTO points_transactions (ambassador_id, amount, type, reason) VALUES (%s, %s, 'earn', 'Refund: Order Cancelled')",
            (order["ambassador_id"], order["amount"]),
        )

    conn.commit()
    logger.info(f"Order {order_id} cancelled by {current_user['email']}")
    return {"detail": "Order cancelled and balance refunded"}


@router.put("/admin/redeem/{order_id}/fulfill")
def fulfill_order(
    order_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Mark a redemption order as fulfilled."""
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE redemption_orders SET status = 'fulfilled' WHERE id = %s RETURNING *",
        (str(order_id),),
    )
    order = cursor.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create the official transaction only upon fulfillment
    if order["wallet"] == "points":
        cursor.execute(
            "SELECT name, points_cost FROM swag_items WHERE id = %s", (str(order["item_id"]),)
        )
        item = cursor.fetchone()
        cursor.execute(
            """INSERT INTO points_transactions (ambassador_id, amount, type, reason)
               VALUES (%s, %s, 'redeem', %s)""",
            (order["ambassador_id"], item["points_cost"], f"Redeemed: {item['name']}"),
        )
    else:
        cursor.execute(
            """INSERT INTO commission_transactions (ambassador_id, amount, type)
               VALUES (%s, %s, 'redeem')""",
            (order["ambassador_id"], order["amount"]),
        )
        
    from core.notifications import create_notification
    create_notification(conn, str(order["ambassador_id"]), "Order Fulfilled!", f"Your redemption order for {order['wallet']} has been fulfilled.", "redemption")

    conn.commit()
    return order


@router.put("/admin/redeem/{order_id}/reject")
def reject_order(
    order_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Mark a redemption order as rejected and refund the balance."""
    cursor = conn.cursor()
    
    # Get the order to refund
    cursor.execute("SELECT * FROM redemption_orders WHERE id = %s AND status = 'pending'", (str(order_id),))
    order = cursor.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Pending order not found")

    # Update status to rejected
    cursor.execute(
        "UPDATE redemption_orders SET status = 'rejected' WHERE id = %s RETURNING *",
        (str(order_id),),
    )
    rejected_order = cursor.fetchone()
    
    # No refund needed because it was never officially deducted from the transaction log
    # Just commit the status update
    conn.commit()
    
    from core.notifications import create_notification
    create_notification(conn, str(order["ambassador_id"]), "Order Rejected", f"Your redemption order for {order['wallet']} was rejected. Balance has been refunded.", "redemption")

    return rejected_order


# ── Transaction History ───────────────────────────────────────

@router.get("/transactions/points")
def get_points_transactions(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Get points transaction history for the current user."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT * FROM points_transactions
           WHERE ambassador_id = %s
           ORDER BY created_at DESC""",
        (str(current_user["id"]),),
    )
    return cursor.fetchall()


@router.get("/transactions/commission")
def get_commission_transactions(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Get commission transaction history for the current user."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT ct.*, l.contact_name as lead_name, l.company as lead_company
           FROM commission_transactions ct
           LEFT JOIN leads l ON ct.lead_id = l.id
           WHERE ct.ambassador_id = %s
           ORDER BY ct.created_at DESC""",
        (str(current_user["id"]),),
    )
    return cursor.fetchall()
