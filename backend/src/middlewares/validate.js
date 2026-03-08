function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      return res.status(400).json({
        message: 'Validation error',
        ...(isProd ? {} : { details: error.details.map((d) => d.message) })
      });
    }

    req[source] = value;
    return next();
  };
}

module.exports = validate;
