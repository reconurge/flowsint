const GraphError = ({ error }: { error: Error }) => (
    <div className='h-full w-full flex items-center justify-center gap-2'>
        Error: {error.message}
    </div>
)

export default GraphError 