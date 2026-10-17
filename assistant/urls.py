from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("ask/", views.ask, name="ask"),
    path("sw.js", views.service_worker, name="sw"),
]