from django.urls import path

from trips import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("plan-trip/", views.plan_trip_view, name="plan-trip"),
]
