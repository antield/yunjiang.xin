import * as AssistTool from "../module/assistTool.js";

let loginDialogFn = null;

export function execute(fetchFn, popupPromiseFn, retry, resultConsumerFn, showMessageFn, data) {
    return fetchFn().then(
        response => {
            const statusCode = response.status;
            if (statusCode == 401) {
                return loginDialogFn("当前登录已失效，请重新登录").then(function (loginSuccess) {
                    if (loginSuccess) {
                        return execute(fetchFn, popupPromiseFn, retry, resultConsumerFn, showMessageFn, data);
                    }
                });
            } else {
                if (!response.ok) {
                    console.error("fetch not response ok, status: " + statusCode + ", statusText" + response.statusText);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json().then(obj => {
                        if (obj.success) {
                            return resultConsumerFn(obj);
                        } else {
                            showMessageFn(obj.message);
                            if (popupPromiseFn != null) {
                                return popupPromiseFn().then(function (popupResult) {
                                    if (popupResult) {
                                        if (retry) {
                                            return execute(fetchFn, popupPromiseFn, retry, resultConsumerFn, showMessageFn, data);
                                        } else {
                                            return resultConsumerFn(obj);
                                        }
                                    }
                                });
                            } else {
                                return resultConsumerFn(obj);
                            }
                        }
                    });
                } else if (contentType && contentType.includes('text/html')) {
                    return response.text().then(text => resultConsumerFn(text));
                } else if (contentType && contentType.includes('image/')) {
                    return response.blob().then(blob => resultConsumerFn(blob));
                } else {
                    return response.text().then(text => resultConsumerFn(text));
                }
            }
        },
        error => {
            console.error("fetch error: " + error);
            showMessageFn("请求失败，请检查网络是否正常");
        }
    );
}

export function init(loginDialogFnParam) {
    loginDialogFn = loginDialogFnParam;
}
