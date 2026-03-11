function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      const details = error.details.map((d) => d.message);
      const preferred =
        details.find((m) => m.toLowerCase().includes('mot de passe')) ||
        details.find((m) => m.toLowerCase().includes('password')) ||
        details[0] ||
        'Validation error';

      return res.status(400).json({
        message: isProd ? preferred : 'Validation error',
        code: 'VALIDATION_ERROR',
        ...(isProd ? {} : { details })
      });
    }

    req[source] = value;
    return next();
  };
}

module.exports = validate;
