import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/tuner/tuner.page').then((module) => module.TunerPage),
  },
  {
    path: 'tunings',
    loadComponent: () =>
      import('./features/tunings/tuning-list.page').then((module) => module.TuningListPage),
  },
  {
    path: 'tunings/new',
    loadComponent: () =>
      import('./features/tunings/custom-tuning-editor.page').then(
        (module) => module.CustomTuningEditorPage,
      ),
  },
  {
    path: 'tunings/:id/edit',
    loadComponent: () =>
      import('./features/tunings/custom-tuning-editor.page').then(
        (module) => module.CustomTuningEditorPage,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.page').then((module) => module.SettingsPage),
  },
  { path: '**', redirectTo: '' },
];
