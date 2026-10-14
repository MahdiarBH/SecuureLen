from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Finding

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    class Meta:
        model = User
        fields = ("id", "username", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class FindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Finding
        fields = (
            "id", "title", "asset", "severity", "status", "cvss_score",
            "description", "recommendation", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_cvss_score(self, value):
        if value is not None and not (0 <= value <= 10):
            raise serializers.ValidationError("CVSS score must be between 0.0 and 10.0.")
        return value
