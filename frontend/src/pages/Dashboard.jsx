import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, UserCheck, Target, CheckSquare, Award, Gift, TrendingUp, Download, X, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight, Package, Clock, GraduationCap } from 'lucide-react';
import { generateImpactReport } from '../utils/pdfGenerator';

import { API_URL } from '../config';

export default function Dashboard() {
  const { user, role } = useAuth();

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPointsRedeem, setShowPointsRedeem] = useState(false);
  const [showCommissionRedeem, setShowCommissionRedeem] = useState(false);
  const [pointsTxns, setPointsTxns] = useState([]);
  const [commissionTxns, setCommissionTxns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeLog, setActiveLog] = useState('points'); // 'points' | 'commission' | 'orders'

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchPointsTxns();
      fetchCommissionTxns();
      fetchOrders();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPointsTxns = async () => {
    try { const res = await axios.get(`${API_URL}/transactions/points`); setPointsTxns(res.data); } catch (err) { console.error(err); }
  };

  const fetchCommissionTxns = async () => {
    try { const res = await axios.get(`${API_URL}/transactions/commission`); setCommissionTxns(res.data); } catch (err) { console.error(err); }
  };

  const fetchOrders = async () => {
    try { const res = await axios.get(`${API_URL}/redeem`); setOrders(res.data); } catch (err) { console.error(err); }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Cancel this order? Your balance will be refunded.')) return;
    try {
      await axios.delete(`${API_URL}/redeem/${orderId}`);
      refreshAll();
    } catch (err) { alert(err.response?.data?.detail || err.message); }
  };

  const refreshAll = () => {
    fetchDashboardData();
    fetchPointsTxns();
    fetchCommissionTxns();
    fetchOrders();
  };

  if (loading || !stats) {
    return <div className="p-md text-secondary">Loading dashboard...</div>;
  }

  return (
    <div className="p-md md:p-lg lg:p-xl w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2">Welcome to Mission Control</h1>
          <p className="text-body-lg text-secondary">Here is an overview of your ambassador orbit.</p>
        </div>
        <button
          onClick={() => generateImpactReport(user.email, stats)}
          className="mt-4 md:mt-0 flex items-center bg-tertiary border border-primary hover:bg-primary-90 text-on-surface px-6 py-3 rounded-full font-semibold transition-colors"
        >
          <Download size={18} className="mr-2" />
          Generate Impact Report
        </button>
      </div>

      {/* Main Stats Grid — 2 rows of 3 on desktop for better spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md mb-lg">
        <StatCard icon={<GraduationCap />} title="Sessions Done" value={stats.sessions_done} sub={`${stats.sessions_pending} pending`} accent="green" />
        <StatCard icon={<Users />} title="Students Reached" value={stats.students_reached} sub="Impact" accent="primary" />
        <StatCard icon={<UserCheck />} title="Teachers" value={stats.active_teachers} sub={`${stats.pending_teachers} pending`} />
        <StatCard icon={<Award />} title="Instructors" value={stats.active_instructors} sub={`${stats.pending_instructors} pending`} />
        <StatCard icon={<Target />} title="Pending Leads" value={stats.pending_leads} sub={`${stats.converted_leads} converted`} />
        <StatCard icon={<CheckSquare />} title="Pending Tasks" value={stats.pending_tasks} sub={`${stats.completed_tasks} completed`} />
      </div>


      {/* Leaderboard — full width */}
      <div className="bg-tertiary rounded-lg border border-primary-90 mb-lg overflow-hidden">
        <div className="px-md pt-md pb-4 border-b border-primary-90 flex items-center justify-between">
          <h2 className="text-headline-sm text-on-surface">Global Leaderboard</h2>
          {stats.my_rank && <span className="text-label-sm text-secondary">Your rank: <span className="font-bold text-on-surface">#{stats.my_rank}</span></span>}
        </div>
        {stats.leaderboard.length === 0 ? (
          <p className="text-secondary text-body-sm py-lg text-center">No leaderboard data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-90 text-secondary text-left">
                  <th className="py-3 px-md font-semibold">#</th>
                  <th className="py-3 pr-md font-semibold">Ambassador</th>
                  <th className="py-3 pr-md font-semibold">Country</th>
                  <th className="py-3 pr-md font-semibold text-center">Teachers</th>
                  <th className="py-3 pr-md font-semibold text-center">Instructors</th>
                  <th className="py-3 pr-md font-semibold text-center">Sessions</th>
                  <th className="py-3 pr-md font-semibold text-center">Students</th>
                  <th className="py-3 pr-md font-semibold text-center">Converted</th>
                  <th className="py-3 pr-md font-semibold text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {stats.leaderboard.map((entry, index) => (
                  <LeaderboardRow
                    key={index}
                    rank={index + 1}
                    entry={entry}
                    isMe={entry.id === user.id}
                  />
                ))}
                {/* Only show separate 'You' row if user is NOT in the top 10 */}
                {!stats.leaderboard.find(e => e.id === user.id) && (
                  <tr className="border-t-2 border-primary bg-primary-90/40">
                    <td className="py-3 px-md font-bold text-primary-60">#{stats.my_rank}</td>
                    <td className="py-3 pr-md font-semibold text-on-surface">You</td>
                    <td className="py-3 pr-md text-secondary">{user?.country || '—'}</td>
                    <td className="py-3 pr-md text-center text-on-surface">{stats.active_teachers}</td>
                    <td className="py-3 pr-md text-center text-on-surface">{stats.active_instructors}</td>
                    <td className="py-3 pr-md text-center text-green-400 font-semibold">{stats.sessions_done}</td>
                    <td className="py-3 pr-md text-center text-blue-400 font-semibold">{stats.converted_leads}</td>
                    <td className="py-3 pr-md text-right font-bold text-primary-60">{stats.points_balance.toLocaleString()} pts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
        {/* Points Wallet */}
        <div className="bg-tertiary p-md rounded-lg border border-primary-90 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Gift size={100} /></div>
          <h2 className="text-headline-sm text-on-surface mb-2 relative z-10">Points Wallet</h2>
          <div className="text-5xl font-outfit font-bold text-secondary mb-4 relative z-10">
            {stats.points_balance.toLocaleString()} <span className="text-body-md font-normal text-on-surface">pts</span>
          </div>
          <p className="text-body-sm text-secondary mb-6 relative z-10">
            {stats.points_balance === 0 ? 'Complete tasks or invite instructors to start earning points!' : 'Hint: Complete pending tasks or invite instructors to earn more points!'}
          </p>
          <button onClick={() => setShowPointsRedeem(true)} disabled={stats.points_balance === 0}
            className="mt-auto bg-primary hover:bg-primary-60 text-on-surface font-semibold py-3 rounded-full transition-colors relative z-10 disabled:opacity-40 disabled:cursor-not-allowed">
            Redeem for Swag
          </button>
        </div>

        {/* Commission Wallet - ONLY SHOW IF ENABLED */}
        {stats.commission_enabled && (
          <div className="bg-tertiary p-md rounded-lg border border-primary-90 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={100} /></div>
            <h2 className="text-headline-sm text-on-surface mb-2 relative z-10">Commission Wallet</h2>
            <div className="text-5xl font-outfit font-bold text-secondary mb-4 relative z-10">
              ${stats.commission_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-body-sm text-secondary mb-6 relative z-10">
              {stats.commission_balance === 0 ? 'Submit leads that convert to start earning commission!' : 'Hint: Submit high-quality leads. Commission is earned when leads convert.'}
            </p>
            <button onClick={() => setShowCommissionRedeem(true)} disabled={stats.commission_balance === 0}
              className="mt-auto border border-primary hover:bg-primary-90 text-on-surface font-semibold py-3 rounded-full transition-colors relative z-10 disabled:opacity-40 disabled:cursor-not-allowed">
              Redeem Commission
            </button>
          </div>
        )}
      </div>
      {/* Transaction History & Orders */}
      <div className="bg-tertiary rounded-lg border border-primary-90 overflow-hidden">
        <div className="flex border-b border-primary-90">
          <TabButton label={`Points Log (${pointsTxns.length})`} active={activeLog === 'points'} onClick={() => setActiveLog('points')} />
          {stats.commission_enabled && (
            <TabButton label={`Commission Log (${commissionTxns.length})`} active={activeLog === 'commission'} onClick={() => setActiveLog('commission')} />
          )}
          <TabButton label={`Orders (${orders.length})`} active={activeLog === 'orders'} onClick={() => setActiveLog('orders')} />
        </div>

        <div className="p-md max-h-[400px] overflow-y-auto">
          {activeLog === 'points' && <PointsLog txns={pointsTxns} />}
          {activeLog === 'commission' && <CommissionLog txns={commissionTxns} />}
          {activeLog === 'orders' && <OrdersList orders={orders} onCancel={cancelOrder} />}
        </div>
      </div>

      {/* Redeem Modals */}
      {showPointsRedeem && (
        <PointsRedeemModal
          balance={stats.points_balance}
          onClose={() => setShowPointsRedeem(false)}
          onSuccess={() => { setShowPointsRedeem(false); refreshAll(); }}
        />
      )}
      {showCommissionRedeem && (
        <CommissionRedeemModal
          balance={stats.commission_balance}
          onClose={() => setShowCommissionRedeem(false)}
          onSuccess={() => { setShowCommissionRedeem(false); refreshAll(); }}
        />
      )}
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-6 py-3 text-label-md font-semibold transition-colors ${active ? 'text-on-surface border-b-2 border-primary bg-surface/50' : 'text-secondary hover:text-on-surface hover:bg-surface/30'}`}>
      {label}
    </button>
  );
}

// ── Points Log (earnings only — redemptions shown in Orders tab) ──

function PointsLog({ txns }) {
  if (txns.length === 0) return <p className="text-secondary text-center py-lg">No points history yet. Complete tasks to earn points!</p>;
  return (
    <div className="space-y-2">
      {txns.map((tx, i) => {
        const isRedeem = tx.type === 'redeem';
        return (
          <div key={tx.id || i} className="flex items-center justify-between py-2 border-b border-primary-90/30 last:border-0">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRedeem ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {isRedeem ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
              </div>
              <div>
                <p className="text-label-md text-on-surface">{tx.reason || (isRedeem ? 'Points Redeemed' : 'Points Earned')}</p>
                <p className="text-label-sm text-secondary">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
            </div>
            <span className={`font-bold text-label-lg ${isRedeem ? 'text-red-400' : 'text-green-400'}`}>
              {isRedeem ? '-' : '+'}{tx.amount} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Commission Log (earnings only — withdrawals shown in Orders tab) ──

function CommissionLog({ txns }) {
  if (txns.length === 0) return <p className="text-secondary text-center py-lg">No commission history yet. Submit leads that convert!</p>;
  return (
    <div className="space-y-2">
      {txns.map((tx, i) => {
        const isRedeem = tx.type === 'redeem';
        return (
          <div key={tx.id || i} className="flex items-center justify-between py-2 border-b border-primary-90/30 last:border-0">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRedeem ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {isRedeem ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
              </div>
              <div>
                <p className="text-label-md text-on-surface">
                  {isRedeem 
                    ? 'Commission Withdrawal' 
                    : `Commission from ${tx.lead_name ? `${tx.lead_name} @ ${tx.lead_company}` : 'converted lead'}`}
                </p>
                <p className="text-label-sm text-secondary">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
            </div>
            <span className={`font-bold text-label-lg ${isRedeem ? 'text-red-400' : 'text-green-400'}`}>
              {isRedeem ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Orders List ──────────────────────────────────────────────

function OrdersList({ orders, onCancel }) {
  if (orders.length === 0) return <p className="text-secondary text-center py-lg">No redemption orders yet. Use the Redeem buttons above!</p>;

  const statusStyles = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    fulfilled: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const value = o.wallet === 'points'
          ? (o.points_cost ? `-${o.points_cost} pts` : null)
          : (o.amount ? `-$${parseFloat(o.amount).toFixed(2)}` : null);

        return (
          <div key={o.id} className="flex items-center justify-between py-3 border-b border-primary-90/30 last:border-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary-90 flex items-center justify-center text-primary-60">
                {o.wallet === 'points' ? <Package size={16} /> : <DollarSign size={16} />}
              </div>
              <div>
                <p className="text-label-md text-on-surface">
                  {o.wallet === 'points'
                    ? `Swag: ${o.item_name || 'Unknown Item'}`
                    : 'Commission Withdrawal'}
                </p>
                <p className="text-label-sm text-secondary">
                  {new Date(o.created_at).toLocaleString()} &middot; {o.address}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {value && (
                <span className={`font-bold text-label-md ${o.wallet === 'points' ? 'text-primary-60' : 'text-green-400'}`}>
                  {value}
                </span>
              )}
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusStyles[o.status] || 'bg-surface border-secondary text-secondary'}`}>
                {o.status.toUpperCase()}
              </span>
              {o.status === 'pending' && (
                <button
                  onClick={() => onCancel(o.id)}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Points Redeem Modal ──────────────────────────────────────

function PointsRedeemModal({ balance, onClose, onSuccess }) {
  const [swagItems, setSwagItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetchSwag(); }, []);

  const fetchSwag = async () => {
    try { const res = await axios.get(`${API_URL}/swag`); setSwagItems(res.data); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRedeem = async () => {
    if (!selectedItem) return;
    if (!address.trim()) { setError('Please enter a shipping address.'); return; }
    setSubmitting(true); setError('');
    try {
      await axios.post(`${API_URL}/redeem`, { item_id: selectedItem.id, wallet: 'points', address: address.trim() });
      setSuccess(true); setTimeout(onSuccess, 1500);
    } catch (err) { setError(err.response?.data?.detail || err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-lg pb-0">
          <div>
            <h2 className="text-headline-sm text-on-surface flex items-center"><ShoppingBag size={20} className="mr-2 text-primary-60" /> Redeem Points for Swag</h2>
            <p className="text-body-sm text-secondary mt-1">Your balance: <span className="font-bold text-on-surface">{balance.toLocaleString()} pts</span></p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface"><X size={24} /></button>
        </div>
        <div className="p-lg">
          {success ? (
            <div className="text-center py-lg">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-headline-sm text-on-surface mb-2">Order Placed!</h3>
              <p className="text-secondary">Your swag order has been submitted. We'll ship it soon!</p>
            </div>
          ) : loading ? (
            <p className="text-secondary">Loading swag catalog...</p>
          ) : swagItems.length === 0 ? (
            <p className="text-secondary text-center py-lg">No swag items available right now.</p>
          ) : (
            <>
              {error && <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm mb-md">
                {swagItems.map((item) => {
                  const canAfford = balance >= item.points_cost;
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <button key={item.id} onClick={() => canAfford && setSelectedItem(item)} disabled={!canAfford}
                      className={`text-left rounded-lg border-2 transition-all overflow-hidden flex flex-col ${isSelected ? 'border-primary bg-primary-90' : canAfford ? 'border-primary-90 bg-surface hover:border-primary/50' : 'border-primary-90 bg-surface opacity-40 cursor-not-allowed'}`}>
                      {item.image_url && (
                        <div className="h-32 w-full overflow-hidden border-b border-primary-90 bg-tertiary">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-label-lg text-on-surface font-semibold">{item.name}</h4>
                          <span className={`text-label-sm font-bold px-2 py-0.5 rounded-full ${canAfford ? 'text-primary-60 bg-primary-90' : 'text-secondary bg-surface'}`}>{item.points_cost} pts</span>
                        </div>
                        <p className="text-body-sm text-secondary">{item.description}</p>
                        {!canAfford && <p className="text-label-sm text-error mt-2">Need {item.points_cost - balance} more pts</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedItem && (
                <div className="space-y-sm border-t border-primary-90 pt-md">
                  <p className="text-label-md text-on-surface">Redeeming: <span className="font-bold">{selectedItem.name}</span> for <span className="text-primary-60 font-bold">{selectedItem.points_cost} pts</span></p>
                  <div>
                    <label className="block text-label-md text-secondary mb-1">Shipping Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                      className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors resize-none" placeholder="Enter your full shipping address" />
                  </div>
                  <button onClick={handleRedeem} disabled={submitting}
                    className="w-full bg-primary hover:bg-primary-60 text-on-surface font-semibold py-3 rounded-full transition-colors disabled:opacity-50">
                    {submitting ? 'Placing Order...' : `Redeem for ${selectedItem.points_cost} pts`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Commission Redeem Modal ──────────────────────────────────

function CommissionRedeemModal({ balance, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError('Please enter a valid amount.'); return; }
    if (numAmount > balance) { setError(`Amount exceeds your balance of $${balance.toFixed(2)}.`); return; }
    if (!address.trim()) { setError('Please enter payment details / address.'); return; }
    setSubmitting(true); setError('');
    try {
      await axios.post(`${API_URL}/redeem`, { wallet: 'commission', amount: numAmount, address: address.trim() });
      setSuccess(true); setTimeout(onSuccess, 1500);
    } catch (err) { setError(err.response?.data?.detail || err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-lg pb-0">
          <div>
            <h2 className="text-headline-sm text-on-surface flex items-center"><DollarSign size={20} className="mr-2 text-primary-60" /> Redeem Commission</h2>
            <p className="text-body-sm text-secondary mt-1">Available: <span className="font-bold text-on-surface">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface"><X size={24} /></button>
        </div>
        <div className="p-lg">
          {success ? (
            <div className="text-center py-lg">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-headline-sm text-on-surface mb-2">Withdrawal Requested!</h3>
              <p className="text-secondary">Your commission withdrawal is being processed.</p>
            </div>
          ) : (
            <>
              {error && <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">{error}</div>}
              <div className="space-y-sm">
                <div>
                  <label className="block text-label-md text-secondary mb-1">Amount ($)</label>
                  <input type="number" step="0.01" min="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors" placeholder="0.00" />
                  <button type="button" onClick={() => setAmount(balance.toFixed(2))} className="text-primary-60 text-label-sm mt-1 hover:underline">
                    Withdraw all (${balance.toFixed(2)})
                  </button>
                </div>
                <div>
                  <label className="block text-label-md text-secondary mb-1">Payment Details</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Bank details, PayPal, or preferred payment method" />
                </div>
                <button onClick={handleRedeem} disabled={submitting}
                  className="w-full bg-primary hover:bg-primary-60 text-on-surface font-semibold py-3 rounded-full transition-colors disabled:opacity-50">
                  {submitting ? 'Processing...' : 'Request Withdrawal'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────

function StatCard({ icon, title, value, sub, accent }) {
  return (
    <div className="bg-surface p-sm rounded-lg border border-primary-90 flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-full bg-tertiary flex items-center justify-center ${accent === 'green' ? 'text-green-400' : 'text-primary-60'}`}>{icon}</div>
      <div>
        <p className="text-label-sm text-secondary uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-outfit font-bold text-on-surface">{value}</p>
        {sub && <p className="text-label-sm text-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, entry, isMe = false }) {
  const medals = ['1st', '2nd', '3rd'];
  return (
    <tr className={`border-b border-primary-90/30 last:border-0 ${isMe ? 'bg-primary-90/40 border-t-2 border-primary' : rank <= 3 ? 'bg-primary-90/20' : ''}`}>
      <td className={`py-3 px-md font-bold ${rank <= 3 && !isMe ? 'text-primary-60' : 'text-secondary'}`}>
        {isMe ? `#${rank}` : medals[rank - 1] || `#${rank}`}
      </td>
      <td className="py-3 pr-md font-semibold text-on-surface">{entry.name}</td>
      <td className="py-3 pr-md text-secondary">{entry.country || '—'}</td>
      <td className="py-3 pr-md text-center text-on-surface">{entry.teachers ?? '—'}</td>
      <td className="py-3 pr-md text-center text-on-surface">{entry.instructors ?? '—'}</td>
      <td className="py-3 pr-md text-center text-green-400 font-semibold">{entry.sessions_done ?? '—'}</td>
      <td className="py-3 pr-md text-center text-on-surface font-semibold">{entry.students_reached ?? '0'}</td>
      <td className="py-3 pr-md text-center text-blue-400 font-semibold">{entry.converted_leads ?? '—'}</td>
      <td className="py-3 pr-md text-right font-bold text-primary-60">{(entry.points ?? 0).toLocaleString()} pts</td>
    </tr>
  );
}
