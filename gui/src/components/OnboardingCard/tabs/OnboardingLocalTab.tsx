import {
  LOCAL_ONBOARDING_CHAT_MODEL,
  LOCAL_ONBOARDING_CHAT_TITLE,
  LOCAL_ONBOARDING_FIM_MODEL,
  ONBOARDING_LOCAL_MODEL_TITLE,
} from "core/config/onboarding";
import { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "../..";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { hasPassedFTL } from "../../../util/freeTrial";
import AddModelButtonSubtext from "../../AddModelButtonSubtext";
import OllamaModelDownload from "../components/OllamaModelDownload";
import { OllamaStatus } from "../components/OllamaStatus";
import { useSubmitOnboarding } from "../hooks";
import { setDefaultModel } from "../../../redux/slices/configSlice";
import { setDialogMessage, setShowDialog } from "../../../redux/slices/uiSlice";

const OLLAMA_CHECK_INTERVAL_MS = 3000;

interface OnboardingLocalTabProps {
  isDialog?: boolean;
}

function OnboardingLocalTab({ isDialog }: OnboardingLocalTabProps) {
  const dispatch = useDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const { submitOnboarding } = useSubmitOnboarding(
    hasPassedFTL() ? "LocalAfterFreeTrial" : "Local",
    isDialog,
  );
  const [hasLoadedChatModel, setHasLoadedChatModel] = useState(false);
  const [downloadedOllamaModels, setDownloadedOllamaModels] = useState<
    string[]
  >([]);

  const [isOllamaConnected, setIsOllamaConnected] = useState(false);

  const hasDownloadedChatModel = Array.isArray(downloadedOllamaModels)
    ? downloadedOllamaModels.some((ollamaModel) =>
        ollamaModel.startsWith(LOCAL_ONBOARDING_CHAT_MODEL),
      )
    : false;

  const hasDownloadedAutocompleteModel = Array.isArray(downloadedOllamaModels)
    ? downloadedOllamaModels.some((ollamaModel) =>
        ollamaModel.startsWith(LOCAL_ONBOARDING_CHAT_MODEL),
      )
    : false;

  /**
   * The first time we detect that a chat model has been loaded,
   * we send an empty request to load it
   */
  useEffect(() => {
    if (!hasLoadedChatModel && hasDownloadedChatModel) {
      ideMessenger.post("llm/complete", {
        completionOptions: {},
        prompt: "",
        title: ONBOARDING_LOCAL_MODEL_TITLE,
      });

      setHasLoadedChatModel(true);
    }
  }, [downloadedOllamaModels, isOllamaConnected]);

  useEffect(() => {
    const fetchDownloadedModels = async () => {
      try {
        const result = await ideMessenger.request("llm/listModels", {
          title: ONBOARDING_LOCAL_MODEL_TITLE,
        });
        if (result.status === "success") {
          // TODO - temporary fix, see notes
          // https://github.com/continuedev/continue/pull/3059
          if (Array.isArray(result.content)) {
            setDownloadedOllamaModels(result.content);
            setIsOllamaConnected(true);
          } else {
            setDownloadedOllamaModels([]);
            setIsOllamaConnected(false);
          }
        } else {
          throw new Error("Failed to fetch models");
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setIsOllamaConnected(false);
      }
    };

    const intervalId = setInterval(
      fetchDownloadedModels,
      OLLAMA_CHECK_INTERVAL_MS,
    );

    void fetchDownloadedModels();

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <p className="mb-2 text-lg font-bold leading-tight">Install Ollama</p>
        <OllamaStatus isOllamaConnected={isOllamaConnected} />
      </div>

      <OllamaModelDownload
        title="Download Chat model"
        modelName={LOCAL_ONBOARDING_CHAT_MODEL}
        hasDownloaded={hasDownloadedChatModel}
      />

      <OllamaModelDownload
        title="Download Autocomplete model"
        modelName={LOCAL_ONBOARDING_FIM_MODEL}
        hasDownloaded={hasDownloadedAutocompleteModel}
      />

      <div className="mt-4 w-full">
        <Button
          onClick={() => {
            submitOnboarding();

            if (isDialog) {
              dispatch(setDialogMessage(undefined));
              dispatch(setShowDialog(false));
            }

            // Set the selected model to the local chat model
            dispatch(
              setDefaultModel({
                title: LOCAL_ONBOARDING_CHAT_TITLE,
                force: true, // Because it doesn't exist in the webview's config object yet
              }),
            );
          }}
          className="w-full"
          disabled={!hasDownloadedChatModel}
        >
          Connect
        </Button>
        <AddModelButtonSubtext />
      </div>
    </div>
  );
}

export default OnboardingLocalTab;
