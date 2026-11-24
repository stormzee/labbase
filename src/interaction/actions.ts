import { STEP_META } from '../domain/constants';
import { getProgress, useLabStore } from '../store/labStore';

/** Context-sensitive primary action used by Space, Enter, the gesture fist and the action dock. */
export function runPrimaryAction(): void {
  const state = useLabStore.getState();
  const progress = getProgress(state);
  switch (progress.currentStep) {
    case 'arrange': {
      if (state.placements.burette.snappedTo !== 'buretteClamp') {
        state.selectApparatus('burette');
        useLabStore.getState().snapSelectedToHome();
        return;
      }
      if (state.placements.flask.snappedTo !== 'flaskBay') {
        state.selectApparatus('flask');
        useLabStore.getState().snapSelectedToHome();
        return;
      }
      state.notify('info', 'Arrange the apparatus', 'Place the burette in the clamp and the flask in the bay.');
      return;
    }
    case 'pipette':
      state.actionPipette();
      return;
    case 'indicator':
      state.actionIndicator();
      return;
    case 'fill':
      state.actionFillBurette();
      return;
    case 'titrate':
      if (state.flow !== 'off') {
        state.setFlow('off');
      } else if (state.experiment.endpointReached) {
        state.notify('info', 'Endpoint reached', 'Close the stopcock, then record the final reading.');
      } else {
        state.toggleStopcock();
      }
      return;
    case 'record':
      state.recordReading();
      return;
    case 'calculate':
      state.calculate();
      return;
    default:
      state.notify(
        'success',
        'Titration complete',
        'The unknown concentration has been calculated. Reset for a fresh sample.',
      );
  }
}

export function primaryActionLabel(): string {
  const state = useLabStore.getState();
  const progress = getProgress(state);
  switch (progress.currentStep) {
    case 'arrange':
      return 'Arrange apparatus';
    case 'pipette':
      return 'Pipette 25.00 mL';
    case 'indicator':
      return 'Add 3 drops';
    case 'fill':
      return 'Fill burette';
    case 'titrate':
      return state.flow !== 'off' ? 'Stop the flow' : 'Start the flow';
    case 'record':
      return 'Record reading';
    case 'calculate':
      return 'Calculate result';
    default:
      return 'Titration complete';
  }
}

export function currentStepShort(): string {
  const state = useLabStore.getState();
  const progress = getProgress(state);
  return progress.currentStep ? STEP_META[progress.currentStep].short : 'Done';
}
