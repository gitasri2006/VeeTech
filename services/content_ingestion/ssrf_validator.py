"""
Discovery SSRF Security Shield
Enforces strict security validation on external URL requests to protect internal infrastructure.
"""

import ipaddress
import logging
import socket
import urllib.parse
from typing import Tuple

logger = logging.getLogger("discovery.ssrf_shield")

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
    "169.254.169.254",
}


def is_ip_private_or_restricted(ip_str: str) -> bool:
    """Checks if an IP address belongs to private, loopback, link-local, or reserved networks."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    except ValueError:
        return True


def validate_url_safety(url: str) -> Tuple[bool, str]:
    """
    Validates that a URL is safe to fetch via HTTP/HTTPS:
    - HTTP or HTTPS scheme only
    - Valid non-empty hostname
    - No localhost / internal domain names
    - Resolves DNS and blocks private/loopback/cloud metadata IP addresses
    """
    if not url or not isinstance(url, str):
        return False, "Empty or invalid URL provided."

    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL contains no valid hostname."

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".local") or hostname_lower.endswith(".internal"):
        return False, f"Access to internal host '{hostname}' is prohibited."

    # Check for direct IP in hostname
    try:
        ip_obj = ipaddress.ip_address(hostname_lower)
        if is_ip_private_or_restricted(str(ip_obj)):
            return False, f"Direct access to private or restricted IP '{hostname}' is blocked."
    except ValueError:
        # Not a raw IP literal, proceed to DNS resolution
        pass

    # Resolve hostname via DNS and check all resolved IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        resolved_ips = {item[4][0] for item in addr_info if item and len(item) > 4 and item[4]}
        for ip in resolved_ips:
            if is_ip_private_or_restricted(ip):
                logger.warning("SSRF blocked: Hostname %s resolved to restricted IP %s", hostname, ip)
                return False, f"Hostname '{hostname}' resolves to restricted internal IP address '{ip}'."
    except socket.gaierror as e:
        return False, f"DNS resolution failed for hostname '{hostname}': {e}"
    except Exception as e:
        return False, f"Host validation error for '{hostname}': {e}"

    return True, "Safe"
