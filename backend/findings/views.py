import csv
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from rest_framework import generics, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Finding
from .serializers import FindingSerializer, RegisterSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class FindingViewSet(viewsets.ModelViewSet):
    serializer_class = FindingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "asset", "description", "recommendation"]
    ordering_fields = ["created_at", "updated_at", "severity", "title"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = Finding.objects.filter(owner=self.request.user)
        severity = self.request.query_params.get("severity")
        status = self.request.query_params.get("status")
        if severity:
            queryset = queryset.filter(severity=severity)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        by_severity = {key: qs.filter(severity=key).count() for key, _ in Finding.Severity.choices}
        by_status = {key: qs.filter(status=key).count() for key, _ in Finding.Status.choices}
        return Response({
            "total": qs.count(),
            "open": qs.filter(status=Finding.Status.OPEN).count(),
            "critical": qs.filter(severity=Finding.Severity.CRITICAL).count(),
            "resolved": qs.filter(status=Finding.Status.RESOLVED).count(),
            "by_severity": by_severity,
            "by_status": by_status,
        })

    @action(detail=False, methods=["get"])
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="securelens-findings.csv"'
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["Title", "Asset", "Severity", "Status", "CVSS", "Description", "Recommendation", "Created"])
        for item in self.filter_queryset(self.get_queryset()):
            writer.writerow([item.title, item.asset, item.severity, item.status, item.cvss_score or "",
                             item.description, item.recommendation, item.created_at.isoformat()])
        return response
