import logging
from fastapi import APIRouter, Depends
from database import get_db_connection
from core import dependencies

logger = logging.getLogger("dashboard")

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Return real dashboard stats for the current user."""
    cursor = conn.cursor()
    user_id = str(current_user["id"])

    # Leads
    cursor.execute("SELECT COUNT(*) as count FROM leads WHERE ambassador_id = %s", (user_id,))
    total_leads = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM leads WHERE ambassador_id = %s AND status = 'submitted'", (user_id,))
    pending_leads = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM leads WHERE ambassador_id = %s AND status = 'converted'", (user_id,))
    converted_leads = cursor.fetchone()["count"]

    # Tasks
    cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = %s AND status IN ('pending', 'accepted')", (user_id,))
    pending_tasks = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = %s AND status = 'approved'", (user_id,))
    completed_tasks = cursor.fetchone()["count"]

    # Teachers
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE invited_by_id = %s AND role = 'teacher' AND status = 'active'", (user_id,))
    active_teachers = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE invited_by_id = %s AND role = 'teacher' AND status = 'pending'", (user_id,))
    pending_teachers = cursor.fetchone()["count"]

    # Instructors
    cursor.execute("SELECT COUNT(*) as count FROM instructors WHERE invited_by = %s AND status = 'active'", (user_id,))
    active_instructors = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM instructors WHERE invited_by = %s AND status = 'pending'", (user_id,))
    pending_instructors = cursor.fetchone()["count"]

    # Sessions (across all teachers recruited by this ambassador)
    cursor.execute(
        """SELECT COUNT(*) as count, COALESCE(SUM(ts.attended_students), 0) as reached FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id
           WHERE u.invited_by_id = %s AND ts.status = 'done'""",
        (user_id,),
    )
    res_done = cursor.fetchone()
    sessions_done = res_done["count"]
    students_reached = res_done["reached"]
    
    cursor.execute(
        """SELECT COUNT(*) as count FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id
           WHERE u.invited_by_id = %s AND ts.status IN ('pending', 'approved')""",
        (user_id,),
    )
    sessions_pending = cursor.fetchone()["count"]

    # Points balance logic: (Earnings - Fulfilled) - Pending
    # Note: Earn/Redeem are in points_transactions. Pending orders are only in redemption_orders.
    cursor.execute(
        """SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0) as balance
           FROM points_transactions WHERE ambassador_id = %s""",
        (user_id,),
    )
    txn_balance = cursor.fetchone()["balance"]
    
    cursor.execute(
        """SELECT COALESCE(SUM(si.points_cost), 0) as pending_cost
           FROM redemption_orders ro
           JOIN swag_items si ON ro.item_id = si.id
           WHERE ro.ambassador_id = %s AND ro.wallet = 'points' AND ro.status = 'pending'""",
        (user_id,),
    )
    pending_points = cursor.fetchone()["pending_cost"]
    points_balance = txn_balance - pending_points

    # Commission balance logic: (Earnings - Fulfilled) - Pending
    cursor.execute(
        """SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0) as balance
           FROM commission_transactions WHERE ambassador_id = %s""",
        (user_id,),
    )
    txn_comm_balance = float(cursor.fetchone()["balance"])
    
    cursor.execute(
        """SELECT COALESCE(SUM(amount), 0) as pending_amount
           FROM redemption_orders
           WHERE ambassador_id = %s AND wallet = 'commission' AND status = 'pending'""",
        (user_id,),
    )
    pending_comm = float(cursor.fetchone()["pending_amount"])
    commission_balance = txn_comm_balance - pending_comm

    # Commission enabled setting
    cursor.execute("SELECT value FROM system_settings WHERE key = 'commission_enabled'")
    setting = cursor.fetchone()
    commission_enabled = setting and setting["value"] == "true"

    # My rank
    cursor.execute(
        """SELECT COUNT(*) + 1 as rank
           FROM (
               SELECT ambassador_id, SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END) as balance
               FROM points_transactions
               GROUP BY ambassador_id
               HAVING SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END) > %s
           ) AS sub""",
        (points_balance,),
    )
    rank_row = cursor.fetchone()
    my_rank = rank_row["rank"] if rank_row else 1

    # Comprehensive leaderboard top 10 - Fixed Join Explosion with Subqueries
    cursor.execute(
        """SELECT
               u.id,
               u.name,
               u.country,
               (SELECT COALESCE(SUM(CASE WHEN pt.type = 'earn' THEN pt.amount ELSE -pt.amount END), 0) 
                FROM points_transactions pt WHERE pt.ambassador_id = u.id) AS points,
               (SELECT COUNT(*) FROM users t WHERE t.invited_by_id = u.id AND t.role = 'teacher' AND t.status = 'active') AS teachers,
               (SELECT COUNT(*) FROM instructors i WHERE i.invited_by = u.id AND i.status = 'active') AS instructors,
               (SELECT COUNT(*) FROM teacher_sessions ts 
                JOIN users t2 ON ts.teacher_id = t2.id 
                WHERE t2.invited_by_id = u.id AND ts.status = 'done') AS sessions_done,
               (SELECT COUNT(*) FROM leads l WHERE l.ambassador_id = u.id AND l.status = 'converted') AS converted_leads,
               (SELECT COALESCE(SUM(ts.attended_students), 0) FROM teacher_sessions ts 
                JOIN users t3 ON ts.teacher_id = t3.id 
                WHERE t3.invited_by_id = u.id AND ts.status = 'done') AS students_reached
           FROM users u
           WHERE u.role = 'ambassador' AND u.status = 'active'
           ORDER BY points DESC
           LIMIT 10"""
    )
    leaderboard = [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "country": row["country"] or "N/A",
            "points": int(row["points"]),
            "teachers": int(row["teachers"]),
            "instructors": int(row["instructors"]),
            "sessions_done": int(row["sessions_done"]),
            "converted_leads": int(row["converted_leads"]),
            "students_reached": int(row["students_reached"]),
        }
        for row in cursor.fetchall()
    ]

    return {
        "active_teachers": active_teachers,
        "pending_teachers": pending_teachers,
        "pending_leads": pending_leads,
        "converted_leads": converted_leads,
        "total_leads": total_leads,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "active_instructors": active_instructors,
        "pending_instructors": pending_instructors,
        "sessions_done": sessions_done,
        "sessions_pending": sessions_pending,
        "students_reached": int(students_reached),
        "points_balance": int(points_balance),
        "commission_balance": commission_balance,
        "commission_enabled": commission_enabled,
        "my_rank": my_rank,
        "leaderboard": leaderboard,
    }
