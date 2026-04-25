import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddPatientModal from './AddPatientModal';
import EditPatientModal from './EditPatientModal';
import '../css/index.css';
import '../css/PriorityTable.css';

const BASE_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Defined outside the component so it isn't recreated on every render
const RiskBadge = ({ level = '' }) => (
    <span className={`risk-badge ${level.toLowerCase()}`}>{level || '—'}</span>
);

// Renders each top factor as a small coloured tag.
// Defined outside the component so it isn't recreated on every render.
const FactorTags = ({ factors }) => {
    if (!Array.isArray(factors) || factors.length === 0) return <span>—</span>;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {factors.map((factor) => (
                <span key={factor} className="factor-tag">{factor}</span>
            ))}
        </div>
    );
};

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
    const [showSuccess,  setShowSuccess]  = useState(false);
    // Stores the ID of the most recently saved patient to display in the success modal
    const [savedId,      setSavedId]      = useState(null);

    const confirmDelete = async () => {
        // Exits early if somehow called without a target
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            const res = await axios.delete(`${BASE_URL}/api/patients/${deleteTarget.patient_id}`);
            // axios only throws on network errors — a failed response must be handled manually
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

    // Remove leading "p" from search input so "p8" and "8" both work
    const searchTerm = searchId.trim().replace(/^p/i, '');

    const filtered = patients
        .filter((patient) => {
            // If there is a search term, only keep patients whose ID matches exactly
            if (searchTerm) {
                const patientId = String(patient.patient_id);
                if (patientId !== searchTerm) return false;
            }
            // If a risk filter is selected, only keep patients that match that risk level
            if (riskFilter !== 'all') {
                const patientRisk = (patient.risk_category || '').toLowerCase();
                if (patientRisk !== riskFilter) return false;
            }
            return true;
        })
        // Sorts patients so highest risk score appears first
        .sort((a, b) => b.risk_score - a.risk_score);

    // Ref: https://www.taniarascia.com/front-end-tables-sort-filter-paginate/

    // Minimum of 1 to prevent page snapping to 0 while patients are still loading
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    // Slice the filtered array to get only the rows for the current page
    // e.g. page 2 with pageSize 10 → slice(10, 20)
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Calculate the row range to display e.g. "Showing 1-10 of 43"
    const beginning = page === 1 ? 1 : pageSize * (page - 1) + 1;
    const end = page === totalPages ? filtered.length : beginning + pageSize - 1;

    // Snaps back to page 1 when filters reduce the total page count
    useEffect(() => {
        if (page > totalPages) setPage(1);
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

            {/* Success modal — auto-dismisses after 3s or on button click */}
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
                        {/* Animated bar that visually represents the 3s auto-dismiss countdown */}
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
                                <th className="col-patient-id">Patient ID</th>
                                <th className="col-age">Age</th>
                                <th className="col-score">Score</th>
                                <th className="col-risk">Risk</th>
                                {/* Shows the clinical factors the model weighted most for each patient */}
                                <th className="col-factors">Key Factors</th>
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
                                    <td className="patient-id">p{p.patient_id}</td>
                                    <td className="text-center">{p.age}</td>
                                    {/* Shows one decimal place for the score, or a dash if not yet scored */}
                                    <td className="text-center risk-score">
                                        {p.risk_score != null ? Number(p.risk_score).toFixed(1) : '—'}
                                    </td>
                                    <td><RiskBadge level={p.risk_category} /></td>
                                    {/* Renders the top contributing clinical factors as coloured tags */}
                                    <td><FactorTags factors={p.top_factors} /></td>
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
                        {/* Shows the current range e.g. "Showing 1-10 of 43 patients" */}
                        <div className="pagination-info">
                            Showing <strong>{filtered.length === 0 ? 0 : beginning}–{end}</strong> of <strong>{filtered.length}</strong> patients
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
                            {/* Disabled when already on the first page */}
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>
                                First
                            </button>
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                Previous
                            </button>
                            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                                Next
                            </button>
                            {/* Disabled when already on the last page */}
                            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                                Last
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PriorityTable;

// References
// https://www.taniarascia.com/front-end-tables-sort-filter-paginate/