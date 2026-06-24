package com.demo.shop.pages;

import com.microsoft.playwright.Page;

public class CheckoutPage {
  private final Page page;

  public CheckoutPage(Page page) {
    this.page = page;
  }

  public void open() {
    page.navigate("https://demo.verity.local/checkout");
  }

  public void fillShipping(String name, String address) {
    page.getByLabel("Full name").fill(name);
    page.getByLabel("Address").fill(address);
  }

  public void placeOrder() {
    page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
        new Page.GetByRoleOptions().setName("Place order")).click();
  }
}
