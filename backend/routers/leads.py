import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

import schemas
from database import get_db_connection
from core import dependencies

logger = logging.getLogger("leads")

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadStatusUpdate(BaseModel):
    status: str  # "in review", "converted", "closed"
    deal_amount: Optional[float] = None  # Required when converting
    commission_rate: Optional[float] = None  # Percentage (e.g. 10 for 10%), required when converting


@router.post("/")
def create_lead(
    lead: schemas.LeadCreate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO leads (ambassador_id, contact_name, company, type, notes, status)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        (str(current_user["id"]), lead.contact_name, lead.company, lead.type, lead.notes, "submitted"),
    )
    db_lead = cursor.fetchone()
    
    from core.notifications import create_notification
    # Notify all admins
    cursor.execute("SELECT id FROM users WHERE role = 'admin'")
    admins = cursor.fetchall()
    for admin in admins:
        create_notification(conn, str(admin["id"]), "New Lead Submitted", f"Ambassador {current_user['name']} submitted a new lead for {lead.company}.", "lead")

    conn.commit()
    logger.info(f"Lead created by {current_user['email']}: {lead.contact_name} @ {lead.company}")
    return db_lead


@router.get("/")
def get_leads(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    cursor = conn.cursor()
    if current_user["role"] == "admin":
        cursor.execute(
            """SELECT l.*, u.name as ambassador_name, u.email as ambassador_email
               FROM leads l
               LEFT JOIN users u ON l.ambassador_id = u.id
               ORDER BY l.created_at DESC"""
        )
    elif current_user["role"] == "ambassador":
        cursor.execute(
            "SELECT * FROM leads WHERE ambassador_id = %s ORDER BY created_at DESC",
            (str(current_user["id"]),),
        )
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    return cursor.fetchall()


@router.put("/{lead_id}/status")
def update_lead_status(
    lead_id: uuid.UUID,
    body: LeadStatusUpdate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Only admin can update lead status."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads WHERE id = %s", (str(lead_id),))
    db_lead = cursor.fetchone()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if body.status not in ("in review", "converted", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'in review', 'converted', or 'closed'")

    # If converting, require deal_amount and commission_rate
    if body.status == "converted":
        if not body.deal_amount or body.deal_amount <= 0:
            raise HTTPException(status_code=400, detail="deal_amount is required and must be positive for conversion")
        if body.commission_rate is None or body.commission_rate < 0:
            raise HTTPException(status_code=400, detail="commission_rate is required for conversion (e.g. 10 for 10%)")

        # Check if commission is enabled
        cursor.execute("SELECT value FROM system_settings WHERE key = 'commission_enabled'")
        setting = cursor.fetchone()
        commission_enabled = setting and setting["value"] == "true"

        commission_amount = round(body.deal_amount * (body.commission_rate / 100), 2)

        if commission_enabled and commission_amount > 0:
            cursor.execute(
                """INSERT INTO commission_transactions (ambassador_id, amount, type, lead_id)
                   VALUES (%s, %s, %s, %s)""",
                (str(db_lead["ambassador_id"]), commission_amount, "earn", str(lead_id)),
            )
            logger.info(
                f"Commission ${commission_amount} awarded for lead {lead_id} "
                f"(deal=${body.deal_amount}, rate={body.commission_rate}%) "
                f"to ambassador {db_lead['ambassador_id']}"
            )

        # Award points for lead conversion (always enabled if rate > 0)
        cursor.execute("SELECT value FROM system_settings WHERE key = 'lead_points_reward'")
        row = cursor.fetchone()
        points_reward = int(row["value"]) if row else 1000
        
        if points_reward > 0:
            cursor.execute(
                """INSERT INTO points_transactions (ambassador_id, amount, type, reason)
                   VALUES (%s, %s, 'earn', %s)""",
                (str(db_lead["ambassador_id"]), points_reward, f"Lead converted: {db_lead['company']}")
            )
            logger.info(f"Awarded {points_reward} points to ambassador {db_lead['ambassador_id']} for lead {lead_id}")

        from core.notifications import create_notification
        msg = f"Lead '{db_lead['contact_name']}' has been converted! You earned {points_reward} points"
        if commission_enabled and commission_amount > 0:
            msg += f" and ${commission_amount} commission"
        msg += "."
        create_notification(conn, str(db_lead["ambassador_id"]), "Lead Converted!", msg, "points")

    cursor.execute("UPDATE leads SET status = %s WHERE id = %s RETURNING *", (body.status, str(lead_id)))
    updated_lead = cursor.fetchone()
    
    if body.status != "converted":
        from core.notifications import create_notification
        create_notification(conn, str(db_lead["ambassador_id"]), "Lead Update", f"The status of your lead '{db_lead['contact_name']}' has been updated to {body.status}.", "lead")

    conn.commit()
    logger.info(f"Lead {lead_id} status -> '{body.status}' by {current_user['email']}")
    return updated_lead
