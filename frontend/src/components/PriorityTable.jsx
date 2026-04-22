import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddPatientModal from './AddPatientModal';
import EditPatientModal from './EditPatientModal';

const BASE_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Defined outside the component so it isn't recreated on every render
const RiskBadge = ({ level = '' }) => (
    <span className={`risk-badge ${level.toLowerCase()}`}>{level || '—'}</span>
);

// Receives patients/loading/error from Dashboard and calls onRefresh
// after any mutation so Dashboard re-fetches and StatCards + table both update
const PriorityTable = ({ patients = [], loading, error, onRefresh }) => {

    const [searchId,     setSearchId]     = useState('');
    const [riskFilter,   setRiskFilter]   = useState('all');
    const [page,         setPage]         = useState(1);
    const [pageSize,     setPageSize]     = useState(10);
    const [showAdd,      setShowAdd]      = useState(false);
    // Holds the patient object to be edited, or null when no edit is in progress
    const [editPatient,  setEditPatient]  = useState(null);
    // Holds the patient object pending deletion, or null when no delete is in progress
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);
    // Reserved for future bulk-action feature
    const [selected,     setSelected]     = useState(new Set());
    const [showSuccess,  setShowSuccess]  = useState(false);
    // Stores the ID of the most recently saved patient to display in the success modal
    const [savedId,      setSavedId]      = useState(null);

    const confirmDelete = async () => {
        // Exits early if somehow called without a target
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            const res = await axios.delete(`${BASE_URL}/api/patients/${deleteTarget.patient_id}`);
            // Treats an unsuccessful response body as an error even if HTTP status was 200
            if (!res.data.success) throw new Error(res.data.message);
            setDeleteTarget(null);
            // Refreshes the patient list in the parent after a successful delete
            onRefresh();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    // Toggles a single row's selected state without mutating the previous Set
    const toggleOne = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    // Selects all visible rows if any are unchecked, otherwise clears all selections
    const toggleAll = (visibleIds) =>
        setSelected((prev) => {
            const allChecked = visibleIds.every((id) => prev.has(id));
            return allChecked ? new Set() : new Set([...prev, ...visibleIds]);
        });

    // Strips a leading "p" from the search input so "p8" and "8" both match patient ID 8
    const filtered = patients
        .filter((p) => {
            if (searchId.trim()) {
                const rawSearch = searchId.trim().replace(/^p/i, '');
                if (!String(p.patient_id).includes(rawSearch)) return false;
            }
            // Skips risk filter when set to "all"
            if (riskFilter !== 'all' && (p.risk_category || '').toLowerCase() !== riskFilter) return false;
            return true;
        })
        // Sorts highest risk score to the top; unscored patients fall to the bottom
        .sort((a, b) => (b.risk_score ?? -Infinity) - (a.risk_score ?? -Infinity));

    // Ensures totalPages is never 0 to avoid dividing by zero in slice calculations
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    // Clamps the current page within valid bounds if filters shrink the result set
    const safePage   = Math.min(page, totalPages);
    const startIdx   = (safePage - 1) * pageSize;
    const pageRows   = filtered.slice(startIdx, startIdx + pageSize);
    const pageIds    = pageRows.map((p) => p.patient_id);

    // Always shows pages 1–4, then appends "..." and the last page if there are more
    const pageNumbers = [
        ...Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1),
        ...(totalPages > 4 ? ['...', totalPages] : []),
    ];

    // Snaps the page back to the last valid page when filters reduce the total count
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    // Automatically hides the success modal after 3 seconds; cleans up the timer on unmount
    useEffect(() => {
        if (!showSuccess) return;
        const timer = setTimeout(() => setShowSuccess(false), 3000);
        return () => clearTimeout(timer);
    }, [showSuccess]);

    return (
        <>
            <AddPatientModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                onPatientAdded={(patientId) => {
                    setShowAdd(false);
                    onRefresh();
                    // Stores the new patient's ID so the success modal can display it
                    setSavedId(patientId);
                    setShowSuccess(true);
                }}
            />

            <EditPatientModal
                isOpen={!!editPatient}
                onClose={() => setEditPatient(null)}
                onPatientUpdated={() => { setEditPatient(null); onRefresh(); setShowSuccess(true); }}
                patient={editPatient}
            />

            {/* Success modal — auto-dismisses after 3 s or on button click */}
            {showSuccess && (
                <>
                    <div className="modal-overlay" onClick={() => setShowSuccess(false)} />
                    <div className="modal-panel-sm" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <h2 className="modal-title" style={{ justifyContent: 'center', marginBottom: 8 }}>
                            <strong>p{savedId}</strong> Patient Saved Successfully
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>
                            The patient record has been saved and risk score updated.
                        </p>
                        <button className="btn-modal-save" onClick={() => setShowSuccess(false)}>
                            Done
                        </button>
                        {/* Animated bar that visually represents the 3 s auto-dismiss countdown */}
                        <div style={{ height: 3, background: 'var(--primary-blue-light)', borderRadius: 99, marginTop: 16, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--primary-blue)', borderRadius: 99, animation: 'shrink 3s linear forwards' }} />
                        </div>
                    </div>
                </>
            )}

            {/* Delete confirmation modal — clicking the overlay cancels the delete */}
            {deleteTarget && (
                <>
                    <div className="modal-overlay" onClick={() => setDeleteTarget(null)} />
                    <div className="modal-panel-sm">
                        <div className="modal-header">
                            <h2 className="modal-title">Delete Patient</h2>
                            <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>✕</button>
                        </div>
                        <p className="delete-confirm-text">
                            Are you sure you want to delete <strong>p{deleteTarget.patient_id}</strong>?
                        </p>
                        <p className="delete-confirm-sub">This action cannot be undone.</p>
                        <div className="modal-footer">
                            <button className="btn-modal-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            {/* Disables the button while the delete request is in flight */}
                            <button className="btn-modal-delete" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="table-container">
                <div className="table-header">
                    <div className="table-header-top">
                        <h1 className="table-title">Priority Patients List</h1>
                        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                            + Add Patient
                        </button>
                    </div>

                    <div className="table-controls-row">
                        <div className="search-box">
                            {/* Resets to page 1 whenever the search term changes */}
                            <input
                                type="text"
                                placeholder="Search by Patient ID (e.g. p8 or 8)"
                                value={searchId}
                                onChange={(e) => { setSearchId(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="filter-controls">
                            {/* Resets to page 1 when the risk filter changes to avoid empty pages */}
                            <select
                                className="filter-select"
                                value={riskFilter}
                                onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="high">High Risk Only</option>
                                <option value="medium">Medium Risk Only</option>
                                <option value="low">Low Risk Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading && <p style={{ padding: '1.5rem', color: '#555' }}>Loading patients…</p>}

                {/* Shows the error alongside a retry button so the clinician can recover */}
                {error && (
                    <div className="modal-error-banner" style={{ margin: '1rem' }}>
                        {error}{' '}
                        <button onClick={onRefresh} className="btn btn-secondary" style={{ marginLeft: 8 }}>
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                            <tr className="column-headers">
                                <th className="col-batch-checkbox">
                                    {/* Header checkbox checks/unchecks all rows on the current page */}
                                    <input
                                        type="checkbox"
                                        checked={pageIds.length > 0 && pageIds.every((id) => selected.has(id))}
                                        onChange={() => toggleAll(pageIds)}
                                    />
                                </th>
                                <th className="col-patient-id">Patient ID</th>
                                <th className="col-age">Age</th>
                                <th className="col-score">Score</th>
                                <th className="col-risk">Risk</th>
                                <th className="col-sex">Sex</th>
                                <th className="col-social">Social Life</th>
                                <th className="col-systolic">Systolic</th>
                                <th className="col-diastolic">Diastolic</th>
                                <th className="col-chol">Chol</th>
                                <th className="col-trig">Trig</th>
                                <th className="col-hdl">HDL</th>
                                <th className="col-ldl">LDL</th>
                                <th className="col-vldl">VLDL</th>
                                <th className="col-hba1c">HbA1c</th>
                                <th className="col-bmi">BMI</th>
                                <th className="col-rbs">RBS</th>
                                <th className="col-actions">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 ? (
                                // Spans all 18 columns so the empty message fills the full table width
                                <tr>
                                    <td colSpan={18} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                        No patients found.
                                    </td>
                                </tr>
                            ) : pageRows.map((p) => (
                                <tr key={p.patient_id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(p.patient_id)}
                                            onChange={() => toggleOne(p.patient_id)}
                                        />
                                    </td>
                                    {/* Prefixes the ID with "p" to match the project's patient ID format */}
                                    <td className="patient-id">p{p.patient_id}</td>
                                    <td className="text-center">{p.age}</td>
                                    {/* Shows one decimal place for the score, or a dash if not yet scored */}
                                    <td className="text-center risk-score">
                                        {p.risk_score != null ? Number(p.risk_score).toFixed(1) : '—'}
                                    </td>
                                    <td><RiskBadge level={p.risk_category} /></td>
                                    <td style={{ textTransform: 'capitalize' }}>{p.sex}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{p.social_life}</td>
                                    <td className="text-center">{p.bp_systolic}</td>
                                    <td className="text-center">{p.bp_diastolic}</td>
                                    <td className="text-center">{p.cholesterol}</td>
                                    <td className="text-center">{p.triglycerides}</td>
                                    <td className="text-center">{p.hdl}</td>
                                    <td className="text-center">{p.ldl}</td>
                                    <td className="text-center">{p.vldl}</td>
                                    <td className="text-center">{p.hba1c}</td>
                                    <td className="text-center">{p.bmi}</td>
                                    <td className="text-center">{p.rbs}</td>
                                    <td className="actions-cell">
                                        {/* Opens the edit modal pre-populated with this patient's data */}
                                        <button className="action-btn edit" onClick={() => setEditPatient(p)}>Edit</button>
                                        {/* Stages the patient for deletion — a confirm modal appears before anything is deleted */}
                                        <button className="action-btn delete" onClick={() => setDeleteTarget(p)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && (
                    <div className="pagination">
                        {/* Shows the current range, e.g. "Showing 1–10 of 43 patients" */}
                        <div className="pagination-info">
                            Showing{' '}
                            <strong>
                                {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)}
                            </strong>{' '}
                            of <strong>{filtered.length}</strong> patients
                        </div>
                        <div className="pagination-controls">
                            <div className="rows-per-page">
                                Show
                                {/* Resets to page 1 when the page size changes to avoid empty pages */}
                                <select
                                    className="filter-select"
                                    style={{ padding: '4px 24px 4px 8px' }}
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                                per page
                            </div>
                            <button className="page-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                Previous
                            </button>
                            {/* Renders numbered page buttons; "..." is a non-clickable separator */}
                            {pageNumbers.map((n, i) =>
                                n === '...' ? (
                                    <span key={`e-${i}`} style={{ padding: '0 8px', color: 'var(--gray-500)' }}>...</span>
                                ) : (
                                    // Highlights the button for the currently active page
                                    <button key={n} className={`page-btn${safePage === n ? ' active' : ''}`} onClick={() => setPage(n)}>
                                        {n}
                                    </button>
                                )
                            )}
                            <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PriorityTable;