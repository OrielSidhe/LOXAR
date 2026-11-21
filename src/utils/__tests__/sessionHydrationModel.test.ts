import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SESSION_HYDRATION,
  buildSessionHydrationPlan,
  shouldOfferProjectBootstrap,
  shouldShowWelcomeOnStart,
  type SessionCacheLike,
} from '../sessionHydrationModel';
import { DEFAULT_EXPORT_FORMATS } from '../lexiconExport';

describe('shouldShowWelcomeOnStart', () => {
  it('por defecto muestra la bienvenida (cache null o sin opt-out)', () => {
    expect(shouldShowWelcomeOnStart(null)).toBe(true);
    expect(shouldShowWelcomeOnStart({})).toBe(true);
    expect(shouldShowWelcomeOnStart({ showWelcomeOnStart: true })).toBe(true);
  });

  it('respeta el opt-out explicito', () => {
    expect(shouldShowWelcomeOnStart({ showWelcomeOnStart: false })).toBe(false);
  });
});

describe('shouldOfferProjectBootstrap', () => {
  it('lo ofrece sin proyecto y sin descarte previo', () => {
    expect(shouldOfferProjectBootstrap(null)).toBe(true);
    expect(shouldOfferProjectBootstrap({})).toBe(true);
  });

  it('no lo ofrece si ya hay projectPath', () => {
    expect(shouldOfferProjectBootstrap({ projectPath: 'C:/loxar' })).toBe(false);
  });

  it('no lo ofrece si el usuario ya lo descarto', () => {
    expect(shouldOfferProjectBootstrap({ bootstrapDismissed: true })).toBe(false);
    expect(
      shouldOfferProjectBootstrap({ projectPath: 'C:/loxar', bootstrapDismissed: true }),
    ).toBe(false);
  });
});

describe('buildSessionHydrationPlan', () => {
  const cache: SessionCacheLike = {
    projectPath: 'C:/loxar/proyecto',
    exportPath: 'C:/loxar/export',
    exportFormats: ['md', 'txt', 'xlsx'],
    bootstrapDismissed: true,
    showWelcomeOnStart: false,
    tourCompleted: true,
  };

  it('hidrata projectPath, exportPath, bootstrapDismissed y hasLocalData', () => {
    const plan = buildSessionHydrationPlan({ cache, hasLexicons: true });
    expect(plan.projectPath).toBe('C:/loxar/proyecto');
    expect(plan.exportPath).toBe('C:/loxar/export');
    expect(plan.bootstrapDismissed).toBe(true);
    expect(plan.hasLocalData).toBe(true);
    expect(plan.sessionCacheData).toBe(cache);
    expect(plan.showWelcome).toBe(false);
    // Con proyecto y descarte previo no se vuelve a ofrecer el bootstrap.
    expect(plan.showProjectBootstrap).toBe(false);
  });

  it('hasLocalData refleja los lexicos locales aunque el cache diga lo contrario', () => {
    expect(buildSessionHydrationPlan({ cache, hasLexicons: false }).hasLocalData).toBe(false);
    expect(buildSessionHydrationPlan({ cache: null, hasLexicons: true }).hasLocalData).toBe(true);
  });

  it('normaliza los formatos de exportacion a los que tienen exportador real', () => {
    expect(buildSessionHydrationPlan({ cache, hasLexicons: false }).exportFormats).toEqual([
      'md',
      'txt',
    ]);
    expect(buildSessionHydrationPlan({ cache: { exportFormats: ['xlsx', 'docx'] }, hasLexicons: false }).exportFormats).toEqual([
      ...DEFAULT_EXPORT_FORMATS,
    ]);
    expect(buildSessionHydrationPlan({ cache: { exportFormats: [] }, hasLexicons: false }).exportFormats).toEqual([
      ...DEFAULT_EXPORT_FORMATS,
    ]);
    expect(buildSessionHydrationPlan({ cache: null, hasLexicons: false }).exportFormats).toEqual([
      ...DEFAULT_EXPORT_FORMATS,
    ]);
  });

  it('cae a null en las rutas cuando el cache no las define', () => {
    const plan = buildSessionHydrationPlan({ cache: {}, hasLexicons: false });
    expect(plan.projectPath).toBeNull();
    expect(plan.exportPath).toBeNull();
    expect(plan.bootstrapDismissed).toBe(false);
    expect(plan.showWelcome).toBe(true);
    expect(plan.showProjectBootstrap).toBe(true);
  });

  it('conserva los proyectos .loxar encontrados en el plan', () => {
    const found = ['C:/Users/test/documentos/mi.loxar', 'C:/Users/test/escritorio/otro.loxar'];
    const plan = buildSessionHydrationPlan({ cache: null, hasLexicons: false, foundProjects: found });
    expect(plan.availableProjects).toEqual(found);
    expect(plan.showProjectBootstrap).toBe(true);
  });

  it('availableProjects es vacio cuando no se escaneo el equipo', () => {
    expect(buildSessionHydrationPlan({ cache: null, hasLexicons: false }).availableProjects).toEqual([]);
    expect(buildSessionHydrationPlan({ cache, hasLexicons: true, foundProjects: [] }).availableProjects).toEqual([]);
  });

  it('es puro: no muta el cache de entrada', () => {
    const original: SessionCacheLike = { ...cache };
    buildSessionHydrationPlan({ cache, hasLexicons: true });
    expect(cache).toEqual(original);
  });
});

describe('DEFAULT_SESSION_HYDRATION', () => {
  it('arranca con bienvenida, sin proyecto y formatos por defecto', () => {
    expect(DEFAULT_SESSION_HYDRATION.showWelcome).toBe(true);
    expect(DEFAULT_SESSION_HYDRATION.projectPath).toBeNull();
    expect(DEFAULT_SESSION_HYDRATION.exportPath).toBeNull();
    expect(DEFAULT_SESSION_HYDRATION.bootstrapDismissed).toBe(false);
    expect(DEFAULT_SESSION_HYDRATION.hasLocalData).toBe(false);
    expect(DEFAULT_SESSION_HYDRATION.showProjectBootstrap).toBe(true);
    expect(DEFAULT_SESSION_HYDRATION.availableProjects).toEqual([]);
    expect(DEFAULT_SESSION_HYDRATION.exportFormats).toEqual([...DEFAULT_EXPORT_FORMATS]);
  });
});
