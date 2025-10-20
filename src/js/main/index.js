import '@material/web/switch/switch.js';
import * as assistTool from "../module/assistTool.js";
import * as loginModule from "../part/login.js";
import * as fetchExecutor from "../module/fetchExecutor.js";

function getTokenStr() {
  return loginModule.getTokenStr();
}

function uploadImage(formData, imgElement, inputHidden) {
  let url = poiManageApiUrl + "sys/file/upload-image";
  let invokeBefore = function () {
    return fetch(url, {
      method: 'POST',
      headers: new Headers({
        'Authorization': getTokenStr(),
      }),
      body: formData,
    });
  };
  let invokeAfter = function (resultObj) {
    if (!resultObj.success) {
      assistTool.showMessageTip(resultObj.message);
      return;
    }
    let picUrl = resultObj.data;
    imgElement.src = poiManageApiUrl + picUrl;
    inputHidden.value = picUrl;
  };
  fetchExecutor.execute(invokeBefore, invokeAfter, assistTool.showMessageTip);
}

function initData() {

}

document.addEventListener("DOMContentLoaded", function () {
  fetchExecutor.init(loginModule.openLoginPromise);
  let afterLogin = function (loginResult) {
    if (loginResult) {
      initData();
    }
  };
  loginModule.init(afterLogin, false, "loginBar", fetchExecutor);
});

window.AssistTool = assistTool;
