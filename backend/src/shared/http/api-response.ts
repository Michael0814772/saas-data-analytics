export type ApiSuccessBody<T> = {
  success: true
  data: T
}

export type ApiErrorBody = {
  success: false
  error: string
  message: string
}

export const apiOk = <T>(data: T): ApiSuccessBody<T> => ({
  success: true,
  data,
})
