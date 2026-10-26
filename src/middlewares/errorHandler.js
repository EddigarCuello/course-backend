export const errorHandler = (err,req,res,next) => {
    const databaseErrors = {
        '23505': [409, 'El registro ya existe'],
        '23503': [400, 'La referencia indicada no existe o está en uso'],
        '23514': [400, 'Los datos enviados no son válidos'],
        '22P02': [400, 'Los datos enviados no son válidos']
    };
    const [databaseStatus, databaseMessage] = databaseErrors[err.code] || [];
    const statusCode = err.statusCode || databaseStatus || 500;
    const message = databaseMessage || err.message || 'error interno del servidor';


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