import { useVideoStore } from './store/videoStore';

function App() {
  const { currentVideo } = useVideoStore();

  return (
    <div className="container">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Video Editor
      </h1>

      {currentVideo ? (
        <div className="text-center">
          <p className="text-lg">当前视频: {currentVideo.filename}</p>
          <p className="text-sm text-gray-600">
            时长: {Math.floor(currentVideo.duration / 60)}:{Math.floor(currentVideo.duration % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-600">
            分辨率: {currentVideo.width}x{currentVideo.height}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-600 mb-4">拖拽视频文件到此处,或点击导入</p>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            导入视频
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
