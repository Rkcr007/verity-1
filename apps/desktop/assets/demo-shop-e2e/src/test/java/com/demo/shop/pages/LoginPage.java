package com.demo.shop.pages;

import com.microsoft.playwright.Page;

public class LoginPage {
  private final Page page;

  public LoginPage(Page page) {
    this.page = page;
  }

  public void open() {
    page.navigate("https://demo.verity.local/login");
  }

  public void login(String email, String password) {
    page.getByLabel("Email").fill(email);
    page.getByLabel("Password").fill(password);
    page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
        new Page.GetByRoleOptions().setName("Sign in")).click();
  }
}
