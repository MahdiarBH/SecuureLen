from django.contrib import admin
from .models import Finding

@admin.register(Finding)
class FindingAdmin(admin.ModelAdmin):
    list_display = ("title", "asset", "severity", "status", "owner", "updated_at")
    list_filter = ("severity", "status", "created_at")
    search_fields = ("title", "asset", "owner__username")
    readonly_fields = ("created_at", "updated_at")
