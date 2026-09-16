import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  checkAvailability,
  claimEmployeeProfile,
  createVacationRequest,
  getMyBalance,
  getMyEmployee,
  listMyRequests,
  listPendingApprovals,
  reviewVacationRequest,
} from '../services/vacations.js';
import { currentYear } from '../utils/formatters.js';

const EMPTY_FORM = { start: '', end: '', note: '' };

export function useVacationPortal() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError('');
    try {
      await claimEmployeeProfile();
      const currentEmployee = await getMyEmployee(session.user.id);
      const [myBalance, myRequests, pending] = await Promise.all([
        getMyBalance(currentEmployee.id, currentYear()),
        listMyRequests(currentEmployee.id),
        listPendingApprovals(currentEmployee.id),
      ]);

      let pendingWithCoverage = pending;
      if (['supervisor', 'hr', 'admin'].includes(currentEmployee.role) && pending.length) {
        pendingWithCoverage = await Promise.all(pending.map(async (request) => {
          try {
            const requestAvailability = await checkAvailability(
              request.employee_id,
              request.start_date,
              request.end_date,
            );
            return { ...request, availability: requestAvailability };
          } catch {
            return { ...request, availability: null };
          }
        }));
      }

      setEmployee(currentEmployee);
      setBalance(myBalance);
      setRequests(myRequests);
      setApprovals(pendingWithCoverage);
    } catch (err) {
      setEmployee(null);
      setBalance(null);
      setRequests([]);
      setApprovals([]);
      setError(err?.message || 'No se pudo cargar el portal.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) {
      setEmployee(null);
      setBalance(null);
      setRequests([]);
      setApprovals([]);
      setAvailability(null);
      return;
    }
    loadDashboard();
  }, [session?.user?.id, loadDashboard]);

  useEffect(() => {
    if (!employee?.id || !form.start || !form.end) {
      setAvailability(null);
      return undefined;
    }
    if (form.end < form.start) {
      setAvailability({ available: false, business_days: 0, reasons: ['La fecha final no puede ser anterior a la inicial.'] });
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const result = await checkAvailability(employee.id, form.start, form.end);
        setAvailability(result);
        setError('');
      } catch (err) {
        setAvailability(null);
        setError(err?.message || 'No se pudo comprobar la disponibilidad.');
      } finally {
        setCheckingAvailability(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [employee?.id, form.start, form.end]);

  const summary = useMemo(() => {
    const totalBalance = balance
      ? Number(balance.entitlement_days || 0) + Number(balance.carry_over_days || 0) + Number(balance.adjustment_days || 0)
      : 0;
    const approvedDays = requests
      .filter((item) => item.status === 'approved')
      .reduce((total, item) => total + Number(item.business_days || 0), 0);
    const pendingDays = requests
      .filter((item) => item.status === 'pending')
      .reduce((total, item) => total + Number(item.business_days || 0), 0);
    return {
      totalBalance,
      approvedDays,
      pendingDays,
      availableDays: Math.max(totalBalance - approvedDays - pendingDays, 0),
      approvalCount: approvals.length,
    };
  }, [balance, requests, approvals]);

  async function submitRequest() {
    if (!employee?.id || !availability?.available) return false;
    setSaving(true);
    setError('');
    try {
      await createVacationRequest(employee.id, form.start, form.end, form.note);
      setForm(EMPTY_FORM);
      setAvailability(null);
      await loadDashboard();
      return true;
    } catch (err) {
      setError(err?.message || 'No se pudo enviar la solicitud.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function decide(requestId, decision, note) {
    setError('');
    try {
      await reviewVacationRequest(requestId, decision, note);
      await loadDashboard();
      return true;
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la decision.');
      return false;
    }
  }

  return {
    session,
    authReady,
    employee,
    balance,
    requests,
    approvals,
    loading,
    error,
    availability,
    checkingAvailability,
    form,
    saving,
    summary,
    setForm,
    setError,
    submitRequest,
    decide,
    reload: loadDashboard,
    signOut: () => supabase.auth.signOut(),
  };
}
