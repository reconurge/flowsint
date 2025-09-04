import sys
import os
import asyncio

if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from flowsint_transforms.domains.resolve import ResolveTransform


async def main():
    # Create test data
    domains = [Domain(domain="adaltas.com")]
    ips = [Ip(address="12.23.34.45"), Ip(address="56.67.78.89")]

    # Test the transform
    transform = ResolveTransform("sketch_123", "scan_123")

    # Test the new KISS postprocess method
    transform.postprocess(ips[:1], domains)  # Only use first IP to match domains length

    print("Postprocess test completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
