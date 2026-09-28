export const errorHandler = (err,req,res,next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'error interno del servidor';


    if (statusCode === 500){
        console.error(err)
    }

    res.status(statusCode).json({
        error:message
    })
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
}