import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { BadRequestError } from './errorHandler';

export const validate = (validations: ValidationChain[]): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Run all validations concurrently
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    const formattedErrors = errors.array().map((err) => ({
      field: 'path' in err ? err.path : (err as { param?: string }).param,
      message: err.msg,
      value: 'value' in err ? err.value : undefined,
    }));

    next(new BadRequestError('Validation failed', formattedErrors));
  };
};
