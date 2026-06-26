from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def root(_request):
    return JsonResponse(
        {
            "service": "ELD Trip Planner API",
            "endpoints": ["/api/health/", "/api/plan-trip/"],
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    # Primary mount.
    path("api/", include("trips.urls")),
    # Fallback mount: some hosting setups (e.g. Vercel Services with a routePrefix)
    # strip the "/api" prefix before the request reaches Django, so also serve at root.
    path("", include("trips.urls")),
    path("", root),
]
