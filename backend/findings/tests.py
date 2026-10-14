from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Finding

User = get_user_model()

class FindingApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="StrongPass123!")
        self.other = User.objects.create_user(username="other", password="StrongPass123!")
        response = self.client.post("/api/auth/token/", {"username": "tester", "password": "StrongPass123!"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_user_only_sees_own_findings(self):
        Finding.objects.create(owner=self.user, title="Mine", asset="example.test")
        Finding.objects.create(owner=self.other, title="Not mine", asset="other.test")
        response = self.client.get("/api/findings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Mine")

    def test_create_finding(self):
        response = self.client.post("/api/findings/", {
            "title": "Missing security header", "asset": "example.test",
            "severity": "medium", "status": "open", "cvss_score": "4.0"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Finding.objects.get().owner, self.user)

    def test_cvss_validation(self):
        response = self.client.post("/api/findings/", {
            "title": "Bad score", "asset": "example.test", "cvss_score": "12.0"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
