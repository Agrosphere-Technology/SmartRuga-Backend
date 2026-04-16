export function successResponse({
    message = "Success",
    data = null,
    meta = null,
}: {
    message?: string;
    data?: any;
    meta?: any;
}) {
    return {
        success: true,
        message,
        data,
        ...(meta ? { meta } : {}),
    };
}

export function errorResponse({
    message = "Something went wrong",
    errors = null,
}: {
    message?: string;
    errors?: any;
}) {
    return {
        success: false,
        message,
        ...(errors ? { errors } : {}),
    };
}