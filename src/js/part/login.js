import * as assistTool from "../module/assistTool.js";

let fetchExecutor = null;

const DISPLAY_REVERT = "revert";
const DISPLAY_NONE = "none";

let loginBoard = null;
let loginedInfoBar = null;
let needLoginInfoBar = null;
let loginResultTip = null;

let loginBoardDialog = null;

let registerBoard = null;
let registerBoardDialog = null;

const requireCaptchaMap = {};
const requireCaptchaTimeoutIdMap = {};
let captchaDialog = null;

function keySuffix() {
  return loginSubmitContextPath.replaceAll(/[:/.]+/g, "_");
}

export function getTokenStr() {
  let tokenKey = "token_" + keySuffix();
  let token = localStorage.getItem(tokenKey);
  return token || "";
}
function saveTokenStr(tokenStr) {
  let tokenKey = "token_" + keySuffix();
  localStorage.setItem(tokenKey, tokenStr);
}
function clearTokenStr() {
  let tokenKey = "token_" + keySuffix();
  localStorage.removeItem(tokenKey);
}
function getUserInfo() {
  let userInfoKey = "userInfo_" + keySuffix();
  let userInfoStr = localStorage.getItem(userInfoKey);
  return userInfoStr == null ? null : JSON.parse(userInfoStr);
}
function saveUserInfo(userInfo) {
  let userInfoStr = JSON.stringify(userInfo);
  let userInfoKey = "userInfo_" + keySuffix();
  localStorage.setItem(userInfoKey, userInfoStr);
}
function clearUserInfo() {
  let userInfoKey = "userInfo_" + keySuffix();
  localStorage.removeItem(userInfoKey);
}

export function checkLogin(tip) {
  let tokenStr = getTokenStr();
  if (tokenStr == null || tokenStr == "") {
    return openLoginPromise(tip);
  } else {
    let userInfo = getUserInfo();
    showLoginedInfoBar(userInfo);
    return Promise.resolve(true);
  }
}

function openRegisterPromise(tip) {
  registerBoard.style.display = DISPLAY_REVERT;
  if (registerBoardDialog == null)
    registerBoardDialog = assistTool.showMessageDialog(registerBoard);
  if (!registerBoardDialog.open)
    registerBoardDialog.showModal();
  return new Promise(function (resolve, reject) {
    let form = registerBoard.querySelector("form");
    let usernameInput = form.querySelector("#registerUsername");
    let registerTipDiv = registerBoard.querySelector("#registerTip");
    if (usernameInput.oninput == null) {
      usernameInput.oninput = function () {
        clearTipDivMsg(registerTipDiv);
      };
    }
    form.onsubmit = function () {
      registerSubmit(this, resolve);
    };
    let cancelButton = form.querySelector("#cancelRegisterButton");
    if (cancelButton.onclick == null) {
      cancelButton.onclick = function () {
        registerBoardDialog.close();
      };
    }
  });
}

export function openLoginPromise(tip) {
  clearLoginStorge();
  loginBoard.style.display = DISPLAY_REVERT;
  if (loginBoardDialog == null)
    loginBoardDialog = assistTool.showMessageDialog(loginBoard);
  if (!loginBoardDialog.open)
    loginBoardDialog.showModal();
  if (tip != null) {
    showTipDivMsg(loginResultTip, tip);
  }
  return new Promise(function (resolve, reject) {
    let form = loginBoard.querySelector("form");
    let usernameInput = form.querySelector("#username");
    if (usernameInput.oninput == null) {
      usernameInput.oninput = function () {
        clearTipDivMsg(loginResultTip);
      };
    }
    form.onsubmit = function () {
      loginSubmit(this, resolve);
    };
  });
}

function showTipDivMsg(tipDiv, msg) {
  tipDiv.style.display = DISPLAY_REVERT;
  tipDiv.querySelector(".errorMsg").textContent = msg;
}

function clearTipDivMsg(tipDiv) {
  tipDiv.style.display = DISPLAY_NONE;
  tipDiv.querySelector(".errorMsg").textContent = "";
}

function openCaptchaPromise(contentObj, tip) {
  let captchaBoard = document.getElementById("captchaBoard");
  captchaBoard.style.display = DISPLAY_REVERT;
  if (captchaDialog == null) {
    captchaDialog = assistTool.showMessageDialog(captchaBoard);
  }
  if (!captchaDialog.open) {
    captchaDialog.showModal();
  }
  let captchaTipDiv = captchaBoard.querySelector("#captchaTip");
  if (tip != null) {
    showTipDivMsg(captchaTipDiv, tip);
  }
  let captchaPromise = new Promise(function (resolve, reject) {
    let captchaPromise = function () {
      let url = loginSubmitContextPath + "auth/captcha-image";
      return fetch(url, {
        headers: new Headers({
          'Content-Type': 'application/json',
        })
      })
    };

    let captchaConsumer = function (resultObj) {
      resultObj = assistTool.regulateRestResult(resultObj);
      if (!resultObj.success) {
        showTipDivMsg(captchaTipDiv, resultObj.message);
        return;
      }

      let data = resultObj.data;
      let captchaImageUrl = data.bgImage;
      let captchaImage = captchaBoard.querySelector("#captchaImage");
      captchaImage.src = captchaImageUrl;
      let croppedImageUrl = data.croppedImage;
      let croppedImage = captchaBoard.querySelector("#croppedImage");
      croppedImage.src = croppedImageUrl;
      let offSetY = data.offSetY;
      croppedImage.style.top = offSetY + "px";
      croppedImage.style.left = "0";
      let croppedImageInput = captchaBoard.querySelector("#croppedImageInput");
      croppedImageInput.value = "0";
      croppedImageInput.oninput = function () {
        croppedImage.style.left = this.value + "px";
      };
      let captchaSubmitButton = captchaBoard.querySelector("#captchaSubmitButton");
      captchaSubmitButton.onclick = function () {
        contentObj.captchaId = data.captchaId;
        contentObj.captchaCode = parseInt(croppedImageInput.value);
        captchaDialog.close();
        croppedImage.style.top = "0";
        croppedImage.style.left = "0";
        clearTipDivMsg(captchaTipDiv);
        resolve(contentObj);
      }
    }
    let showMessageFn = function (tip) {
      showTipDivMsg(captchaTipDiv, tip);
    }
    fetchExecutor.execute(captchaPromise, captchaConsumer, showMessageFn);
  });
  return captchaPromise;
}

function loginSubmitFetch(contentObj) {
  let url = loginSubmitContextPath + "auth/login";
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(contentObj),
    headers: new Headers({
      'Content-Type': 'application/json',
    })
  });
}

function loginSubmit(form, resolve) {
  let formData = new FormData(form);
  let username = formData.get("username").trim();
  if (username == "") {
    showTipDivMsg(loginResultTip, "请输入用户名");
    return;
  }
  let password = formData.get("password");
  if (password == "") {
    showTipDivMsg(loginResultTip, "请输入密码");
    return;
  }
  let contentObj = {
    username,
    password,
  };
  let showTipDivMsgFn = function (tip) {
    showTipDivMsg(loginResultTip, tip);
  };
  let invokeBeforeFn = function (tip) {
    let invokeBefore;
    if (requireCaptchaMap[username]) {
      invokeBefore = openCaptchaPromise(contentObj, tip).then(loginSubmitFetch);
    } else {
      invokeBefore = loginSubmitFetch(contentObj);
    }
    return invokeBefore;
  };
  let invokeAfter = function (resultObj) {
    // resultObj = AssistTool.regulateRestResult(resultObj);
    if (!resultObj.success) {
      if (resultObj.code == "REQUIRE_CAPTCHA") {
        enableRequireCaptchaWindow(username);
        return fetchExecutor.execute(invokeBeforeFn, invokeAfter, showTipDivMsgFn, username);
      } else if (resultObj.code == "CAPTCHA_ERROR") {
        enableRequireCaptchaWindow(username);
        let invokeBeforeTipFn = function () {
          return invokeBeforeFn("验证码校验失败，请重新操作");
        };
        return fetchExecutor.execute(invokeBeforeTipFn, invokeAfter, showTipDivMsgFn, username);
      }

      showTipDivMsg(loginResultTip, resultObj.message);
      return;
    }

    let tokenStr = resultObj.data;
    saveTokenStr(tokenStr);
    loginBoardDialog.close();
    resolve(true);
    showLoginedInfoBar();
  };

  fetchExecutor.execute(invokeBeforeFn, invokeAfter, showTipDivMsgFn, username);
}

function showLoginedInfoBar(userInfo) {
  if (userInfo != null) {
    let nicknameSpan = loginedInfoBar.querySelector(".nickname");
    nicknameSpan.textContent = userInfo.nickname;
    loginedInfoBar.style.display = DISPLAY_REVERT;
    needLoginInfoBar.style.display = DISPLAY_NONE;
  } else {
    let invokeBefore = function () {
      let url = loginSubmitContextPath + "auth/self-info";
      return fetch(url, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
          'manage-token': getTokenStr(),
        })
      });
    };
    let invokeAfter = function (resultObj) {
      resultObj = assistTool.regulateRestResult(resultObj);
      if (!resultObj.success) {
        assistTool.showMessageTip(resultObj.message);
        return;
      }
      userInfo = resultObj.data;
      saveUserInfo(userInfo);
      let nicknameSpan = loginedInfoBar.querySelector(".nickname");
      nicknameSpan.textContent = userInfo.nickname;
      loginedInfoBar.style.display = DISPLAY_REVERT;
      needLoginInfoBar.style.display = DISPLAY_NONE;
    };
    fetchExecutor.execute(invokeBefore, invokeAfter, assistTool.showMessageTip);
  }
}

function registerSubmitFetch(contentObj) {
  let url = loginSubmitContextPath + "auth/register";
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(contentObj),
    headers: new Headers({
      'Content-Type': 'application/json',
    })
  });
}

function registerSubmit(form, resolve) {
  let formData = new FormData(form);
  let registerTipDiv = form.querySelector("#registerTip");
  let username = formData.get("username").trim();
  if (username == "") {
    showTipDivMsg(registerTipDiv, "请输入用户名");
    return;
  }
  let password = formData.get("password");
  if (password == "") {
    showTipDivMsg(registerTipDiv, "请输入密码");
    return;
  }
  let passwordConfirm = formData.get("passwordConfirm");
  if (password != passwordConfirm) {
    showTipDivMsg(registerTipDiv, "两次密码不一致");
    return;
  }
  let nickname = formData.get("nickname").trim();
  let phone = formData.get("phone").trim();
  let mail = formData.get("mail").trim();
  let contentObj = {
    username,
    password,
    nickname,
    phone,
    mail,
  };
  let submitButtons = form.querySelectorAll("[type='submit']");
  let invokeBeforeFn = function (tip) {
    submitButtons.forEach(a => a.disabled = true);
    return openCaptchaPromise(contentObj, tip).then(registerSubmitFetch);
  };
  let invokeAfter = function (resultObj) {
    resultObj = assistTool.regulateRestResult(resultObj);
    if (!resultObj.success) {
      showTipDivMsg(registerTipDiv, resultObj.message);
      return;
    }

    registerBoardDialog.close();
    resolve(username);
  };
  let showTipDivMsgFn = function (tip) {
    showTipDivMsg(registerTipDiv, tip);
  };
  fetchExecutor.execute(invokeBeforeFn, invokeAfter, showTipDivMsgFn).finally(function () {
    submitButtons.forEach(a => a.disabled = false);
  });
}

function logout() {
  let logoutFetch = function () {
    let url = loginSubmitContextPath + "auth/logout";
    return fetch(url, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
        'manage-token': getTokenStr(),
      })
    });
  };
  let logoutConsumer = function (resultObj) {
    resultObj = assistTool.regulateRestResult(resultObj);
    if (!resultObj.success) {
      assistTool.showMessageTip(resultObj.message);
      console.error(resultObj.message);
    }
  }
  fetchExecutor.execute(logoutFetch, logoutConsumer, assistTool.showMessageTip).finally(function () {
    clearLoginStorge();
    location.reload();
  });
}

function clearLoginStorge() {
  clearTokenStr();
  clearUserInfo();
}

function enableRequireCaptchaWindow(username) {
  if (username == null || username.toString().trim() == "") {
    console.error("开启验证码校验失败，用户名无效");
    return false;
  }
  requireCaptchaMap[username] = true;
  if (requireCaptchaTimeoutIdMap[username] != null)
    clearTimeout(requireCaptchaTimeoutIdMap[username]);
  // 2小时后取消验证码
  setTimeout(function () {
    requireCaptchaMap[username] = false;
  }, 1000 * 60 * 60 * 2);
  return true;
}

export function init(afterLogin, requireStartLogin, loginBarElement, fetchExecutorParam) {
  fetchExecutor = fetchExecutorParam;

  loginBoard = document.getElementById("loginBoard");
  loginResultTip = loginBoard.querySelector(".loginResultTip");
  if (typeof loginBarElement == "string") {
    loginBarElement = document.getElementById(loginBarElement);
  }
  needLoginInfoBar = document.getElementById("needLoginInfoBar");
  needLoginInfoBar.style.display = DISPLAY_REVERT;
  loginBarElement.appendChild(needLoginInfoBar);
  let loginAnchor = needLoginInfoBar.querySelector(".loginAnchor");
  loginAnchor.onclick = function () {
    openLoginPromise().then(afterLogin);
  };
  loginedInfoBar = document.getElementById("loginedInfoBar");
  loginBarElement.appendChild(loginedInfoBar);
  let logoutAnchor = loginedInfoBar.querySelector(".logoutAnchor");
  logoutAnchor.onclick = logout;

  if (requireStartLogin)
    checkLogin().then(afterLogin);

  registerBoard = document.getElementById("registerBoard");
  let registerAnchor = loginBoard.querySelector("#registerAnchor");
  registerAnchor.onclick = function () {
    openRegisterPromise().then(function (username) {
      showTipDivMsg(loginResultTip, "注册成功");
      let usernameInputOfLogin = loginBoard.querySelector("#username");
      usernameInputOfLogin.value = username;
      let passwordInputOfLogin = loginBoard.querySelector("#password");
      passwordInputOfLogin.value = "";
    });
  };
}
