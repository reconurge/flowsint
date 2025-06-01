import Loader from '@/components/shared/loader'

const GraphLoader = () => (
    <div className='relative h-full w-full z-50'>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader />
            <div className="mt-4 text-sm text-muted-foreground">
                Loading data...
            </div>
        </div>
    </div>
)

export default GraphLoader 