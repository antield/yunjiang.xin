let loginDialogFn = null;

export function execute(fetchFn, resultConsumerFn, showMessageFn, data) {
  return fetchFn().then(
    (response) => {
      const statusCode = response.status;
      if (statusCode == 401) {
        return loginDialogFn("当前登录已失效，请重新登录").then(function (loginSuccess) {
          if (loginSuccess) {
            return execute(fetchFn, resultConsumerFn, showMessageFn, data);
          }
        });
      } else {
        if (!response.ok) {
          console.error("fetch not response ok, status: " + statusCode + ", statusText: " + response.statusText);
        }
        const responseHeaders = response.headers;
        if (responseHeaders != null) {
          const contentType = response.headers.get("content-type");
          if (contentType != null && contentType.trim() != "") {
            const contentTypeLower = contentType.toLowerCase();
            if (contentTypeLower.startsWith("application/json")) {
              return response.json().then((obj) => resultConsumerFn(obj));
            } else if (contentTypeLower.startsWith("text/") || contentTypeLower.startsWith("application/xml")) {
              return response.text().then((text) => resultConsumerFn(text));
            } else if (
              contentTypeLower.startsWith("application/octet-stream") ||
              contentTypeLower.startsWith("application/zip") ||
              contentTypeLower.startsWith("application/pdf") ||
              contentTypeLower.startsWith("image/") ||
              contentTypeLower.startsWith("audio/") ||
              contentTypeLower.startsWith("video/") ||
              contentTypeLower.startsWith("font/") ||
              contentTypeLower.startsWith("model/")
            ) {
              return response.blob().then((blob) => resultConsumerFn(blob));
            } else if (contentTypeLower.startsWith("multipart/form-data")) {
              return response.formData().then((formData) => resultConsumerFn(formData));
            }
          }
        }
        return response.text().then((text) => resultConsumerFn(text));
      }
    },
    (error) => {
      console.error("fetch error: " + error);
      if (showMessageFn) showMessageFn("请求失败，请检查网络是否正常");
      // return Promise.reject(error);
    },
  );
}

export function init(loginDialogFnParam) {
  loginDialogFn = loginDialogFnParam;
}
