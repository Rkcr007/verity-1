package com.demo.shop.pages;

import com.microsoft.playwright.Page;

public class HomePage {
  private final Page page;

  public HomePage(Page page) {
    this.page = page;
  }

  public void open() {
    page.navigate("https://demo.verity.local/");
  }

  public void browseCatalog() {
    page.getByRole(com.microsoft.playwright.options.AriaRole.LINK,
        new Page.GetByRoleOptions().setName("Shop")).click();
  }
}
