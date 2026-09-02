import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RequestForm from './components/RequestForm';
import RequestsList from './components/RequestsList';
import PurchasesView from './components/PurchasesView';
import OfficialFichaPrint from './components/OfficialFichaPrint';
import PurchaseModal from './components/PurchaseModal';
import Settings from './components/Settings';
import AuthModal from './components/AuthModal';
import { api } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [years, setYears] = useState([]);
  const [areas, setAreas] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('compras_agro_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Modals & Navigation state
  const [editingRequest, setEditingRequest] = useState(null);
  const [printRequestId, setPrintRequestId] = useState(null);
  const [purchaseModalRequestId, setPurchaseModalRequestId] = useState(null);

  // Verify session on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('compras_agro_token');
    if (token) {
      api.getMe().then(data => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      }).catch(() => {
        localStorage.removeItem('compras_agro_token');
        localStorage.removeItem('compras_agro_user');
        setCurrentUser(null);
      });
    }
  }, []);

  // Load Years, Areas, Rubros
  const loadInitialData = async () => {
    try {
      const [yearsData, areasData, rubrosData] = await Promise.all([
        api.getYears(),
        api.getAreas(),
        api.getRubros()
      ]);
      setYears(yearsData || []);
      setAreas(areasData || []);
      setRubros(rubrosData || []);

      if (yearsData && yearsData.length > 0) {
        const exists = yearsData.some(y => y.year === selectedYear);
        if (!exists) {
          setSelectedYear(yearsData[0].year);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  // Load Year-specific data (requests & stats)
  const loadYearData = async (year) => {
    try {
      setLoading(true);
      const [reqsData, statsData] = await Promise.all([
        api.getRequests({ year }),
        api.getStats(year)
      ]);
      setRequests(reqsData || []);
      setStats(statsData || null);
    } catch (err) {
      console.error('Error loading year data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadYearData(selectedYear);
    }
  }, [selectedYear]);

  const refreshAll = async () => {
    await loadInitialData();
    if (selectedYear) {
      await loadYearData(selectedYear);
    }
  };

  const handleEditRequest = async (requestId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const data = await api.getRequest(requestId);
      setEditingRequest(data);
      setActiveTab('new-request');
    } catch (err) {
      alert('Error cargando el pedido: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingRequest(null);
    setActiveTab('requests-list');
  };

  const handleRequestCreated = async () => {
    setEditingRequest(null);
    await refreshAll();
    setActiveTab('requests-list');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    refreshAll();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    refreshAll();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-emerald-200">
      
      {/* Top Bar Header (Navigation & Year Selector & Auth Status) */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setPrintRequestId(null);
          if (tab !== 'new-request') {
            setEditingRequest(null);
          }
          setActiveTab(tab);
        }}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        years={years}
        onRefreshYears={loadInitialData}
        currentUser={currentUser}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* If Print Mode is Active */}
        {printRequestId ? (
          <OfficialFichaPrint
            requestId={printRequestId}
            onBack={() => setPrintRequestId(null)}
          />
        ) : (
          <>
            {/* View 1: Dashboard (Public) */}
            {activeTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                selectedYear={selectedYear}
                onNavigateTab={(tab) => {
                  if ((tab === 'new-request' || tab === 'purchases') && !currentUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  setActiveTab(tab);
                }}
                onFilterRequests={(areaId, rubroId) => {
                  setActiveTab('requests-list');
                }}
              />
            )}

            {/* View 2: New Request / Email Load */}
            {activeTab === 'new-request' && (
              <RequestForm
                areas={areas.filter(a => a.is_active)}
                rubros={rubros.filter(r => r.is_active)}
                selectedYear={selectedYear}
                onRequestCreated={handleRequestCreated}
                editingRequest={editingRequest}
                onCancelEdit={handleCancelEdit}
                currentUser={currentUser}
                onOpenAuthModal={() => setShowAuthModal(true)}
              />
            )}

            {/* View 3: Requests List (Public View, Admin Modifications) */}
            {activeTab === 'requests-list' && (
              <RequestsList
                requests={requests}
                areas={areas}
                rubros={rubros}
                selectedYear={selectedYear}
                onRefresh={refreshAll}
                onEditRequest={handleEditRequest}
                onPrintOfficial={(id) => setPrintRequestId(id)}
                onOpenPurchaseModal={(id) => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  setPurchaseModalRequestId(id);
                }}
                currentUser={currentUser}
                onOpenAuthModal={() => setShowAuthModal(true)}
              />
            )}

            {/* View 4: Purchases Execution */}
            {activeTab === 'purchases' && (
              <PurchasesView
                requests={requests}
                areas={areas}
                rubros={rubros}
                selectedYear={selectedYear}
                onRefresh={refreshAll}
                onOpenPurchaseModal={(id) => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  setPurchaseModalRequestId(id);
                }}
                currentUser={currentUser}
                onOpenAuthModal={() => setShowAuthModal(true)}
              />
            )}

            {/* View 5: Settings & Parametrization */}
            {activeTab === 'settings' && (
              <Settings
                areas={areas}
                rubros={rubros}
                selectedYear={selectedYear}
                onRefreshAreas={loadInitialData}
                onRefreshRubros={loadInitialData}
                onRefreshYears={loadInitialData}
                currentUser={currentUser}
                onOpenAuthModal={() => setShowAuthModal(true)}
              />
            )}
          </>
        )}

      </main>

      {/* Modal: Purchase Recording */}
      {purchaseModalRequestId && (
        <PurchaseModal
          requestId={purchaseModalRequestId}
          onClose={() => setPurchaseModalRequestId(null)}
          onPurchaseSuccess={refreshAll}
        />
      )}

      {/* Modal: Google / Gmail Authentication */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-5 border-t border-slate-800 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-slate-200">Facultad de Ingeniería y Ciencias Agropecuarias (FICA)</strong> - Universidad Nacional de San Luis
          </div>
          <div>
            Departamento de Ciencias Agropecuarias &copy; {new Date().getFullYear()}
          </div>
        </div>
      </footer>

    </div>
  );
}
