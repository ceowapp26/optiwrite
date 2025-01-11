import VideoBlock, { VideoBlockConfig } from "./blocks/video";
import VideoRecorderBlock, {
  VideoRecorderBlockConfig,
} from "./blocks/videoRecorder";
import MediaRecorder from "./blocks/videoRecorder/MediaRecorder";
import GiphyBlock, { GiphyBlockConfig } from "./blocks/giphy/giphyBlock";
import { AudioRecorderBlockConfig } from "./blocks/audioRecorder";
import SpeechToTextBlock, {
  SpeechToTextBlockConfig,
} from "./blocks/speechToText";

const expandDefaultExtensions = [
  VideoBlockConfig(),
  GiphyBlockConfig(),
  VideoRecorderBlockConfig(),
  SpeechToTextBlockConfig(),
  AudioRecorderBlockConfig(),
];

export { expandDefaultExtensions };


