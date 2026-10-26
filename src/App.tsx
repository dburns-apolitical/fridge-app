import { useState } from 'preact/hooks';
import { CompartmentSheet } from './components/CompartmentSheet';
import { HomePager } from './components/HomePager';
import { Settings } from './components/Settings';
import { UseSoon } from './components/UseSoon';
import { getUseSoonItems, todayIso } from './domain/expiry';
import type { TCompartmentId } from './domain/model';
import { useFridge } from './store';

type TView = 'fridge' | 'soon' | 'settings';

export const App = () => {
  const { data, dispatch, saveFailed } = useFridge();
  const [view, setView] = useState<TView>('fridge');
  const [openId, setOpenId] = useState<TCompartmentId | null>(null);

  const today = todayIso();
  const { soonDays } = data.settings;
  const soonItems = getUseSoonItems(data.items, today, soonDays);
  const closeSheet = () => setOpenId(null);

  const tab = (id: TView, label: string, count = 0) => (
    <button type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
      {label}
      {count > 0 && (
        <>
          {' '}
          <span class="tabs__count">{count}</span>
        </>
      )}
    </button>
  );

  return (
    <div class="app">
      <main class="app__main">
        {view === 'fridge' && (
          <HomePager
            data={data}
            alertCount={soonItems.length}
            dispatch={dispatch}
            onOpenCompartment={setOpenId}
          />
        )}
        {view === 'soon' && (
          <UseSoon items={soonItems} today={today} soonDays={soonDays} onOpenCompartment={setOpenId} />
        )}
        {view === 'settings' && <Settings data={data} dispatch={dispatch} />}
      </main>

      {saveFailed && (
        <p class="toast" role="alert">
          {"Couldn't save — try exporting a backup"}
        </p>
      )}

      <nav class="tabs" aria-label="Main">
        {tab('fridge', 'Fridge')}
        {tab('soon', 'Use soon', soonItems.length)}
        {tab('settings', 'Settings')}
      </nav>

      {openId && (
        <CompartmentSheet
          key={openId}
          compartmentId={openId}
          items={data.items.filter((item) => item.compartment === openId)}
          today={today}
          soonDays={soonDays}
          dispatch={dispatch}
          onClose={closeSheet}
        />
      )}
    </div>
  );
};
