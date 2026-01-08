import Loader from '@/components/loader'

const GraphLoader = () => (
  <div className="relative h-full w-full z-50">
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="text-center flex items-center gap-2">
        <Loader />
      </div>
    </div>
  </div>
)

export default GraphLoader
