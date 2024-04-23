import { Scenes } from 'telegraf';

const unwrapCallback = async (ctx, nextScene) => {
  const nextSceneId = await Promise.resolve(nextScene(ctx));
  if (nextSceneId) return ctx.scene.enter(nextSceneId, ctx.scene.state);
  return ctx.scene.leave();
};

/**
 * Takes steps as arguments and returns a sceneFactory
 *
 * Additionally does the following things:
 * 1. Makes sure next step only triggers on `message` or `callbackQuery`
 * 2. Passes second argument - doneCallback to each step to be called when scene is finished
 */
export const composeWizardScene = (...advancedSteps) =>
  /**
   * Branching extension enabled sceneFactory
   * @param sceneType {string}
   * @param nextScene {function} - async func that returns nextSceneType
   */
  function createWizardScene(sceneType, nextScene) {
    return new Scenes.WizardScene(
      sceneType,
      ...advancedSteps.map((stepFn) => async (ctx, next) => {
        /** ignore user action if it is neither message, nor callbackQuery */
        if (!ctx.message && !ctx.callbackQuery) return undefined;
        return stepFn(ctx, () => unwrapCallback(ctx, nextScene), next);
      }),
    );
  };
