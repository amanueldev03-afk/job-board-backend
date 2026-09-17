import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types/response';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
  });
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response<ApiResponse<T>> => {
  return sendSuccess(res, data, message, 201);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message?: string
): Response<ApiResponse<T[]>> => {
  return res.status(200).json({
    success: true,
    ...(message && { message }),
    data,
    meta,
  });
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};
