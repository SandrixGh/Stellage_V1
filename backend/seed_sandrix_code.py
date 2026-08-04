import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from stellage.core.core_dependencies.db_dependency import _session_factory
from stellage.database.models.box_template import BoxTemplate
from stellage.database.models.box_instance import BoxInstance
from sqlalchemy import select

async def update_sandrix_case():
    async with _session_factory() as session:
        sample_code_latex = (
            "import numpy as np\n"
            "import matplotlib.pyplot as plt\n\n"
            "# Solves the differential equation of pendulum motion\n"
            "def solve_pendulum(theta0, omega0, dt=0.01):\n"
            "    g, L = 9.81, 1.0\n"
            "    d2theta = -(g / L) * np.sin(theta0)\n"
            "    return theta0 + omega0 * dt, omega0 + d2theta * dt\n\n"
            "print('STEM Engine Ready. Quantum matrix computed.')\n\n"
            "$$\\frac{d^2\\theta}{dt^2} + \\frac{g}{L}\\sin\\theta = 0$$"
        )

        stmt = select(BoxTemplate).where(BoxTemplate.title.ilike("%Sandrix%"))
        res = await session.execute(stmt)
        templates = res.scalars().all()

        if not templates:
            print("No Sandrix template found in DB. Updating ALL instances...")
            stmt_all = select(BoxInstance)
            inst_res = await session.execute(stmt_all)
            instances = inst_res.scalars().all()
            for box in instances:
                print(f"Updating box instance #{box.serial_number} ({box.id})")
                box.content = {"text": sample_code_latex}
        else:
            for t in templates:
                print(f"Found template: {t.title} ({t.id})")
                stmt_instances = select(BoxInstance).where(BoxInstance.template_id == t.id)
                inst_res = await session.execute(stmt_instances)
                instances = inst_res.scalars().all()
                for box in instances:
                    print(f"Updating box instance #{box.serial_number} ({box.id})")
                    box.content = {"text": sample_code_latex}

        await session.commit()
        print("Success! Sandrix Case updated with Python code & LaTeX formula.")

if __name__ == "__main__":
    asyncio.run(update_sandrix_case())
