import os
import glob
import re

FEATURE_MAPPING = {
    # Customers
    "staff-portal/customers": "customers",
    "reservations": "reservations",
    # Sales & Cash
    "sales": "sales",
    "staff-portal/sales": "sales",
    "staff-portal/cash": "cash_management",
    # Payroll & Expenses
    "payroll": "payroll",
    "staff-portal/payroll": "payroll",
    "staff-portal/transport": "payroll",
    "staff-portal/transportation": "payroll",
    "admin/expenses": "expenses",
    "staff-portal/expenses": "expenses",
    # Attendance & Shifts
    "shifts": "shifts",
    "staff-portal/shifts": "shifts",
    "staff-portal/holidays": "shifts",
    "attendance": "attendance",
    "admin/paid-leaves": "attendance",
    "kiosk/attendance": "attendance",
    # Staff & Training
    "evaluations": "evaluations",
    "training": "training",
    "manuals": "training",
    "staff-portal/rules": "training",
    # Admin Tasks & Inventory
    "admin/tasks": "tasks",
    "inventory": "inventory",
    "staff-portal/inventory": "inventory",
    # School & AI & LINE (handled separately or implicitly via other routes)
}

def update_file(path, feature):
    with open(path, "r") as f:
        content = f.read()
    
    if "requireFeature=" in content:
        print(f"Skipping {path}, already has requireFeature")
        return
        
    if "<AuthGuard" in content:
        # Match <AuthGuard requireRole="admin"> or just <AuthGuard>
        new_content = re.sub(
            r'(<AuthGuard[^>]*)>', 
            r'\1 requireFeature="' + feature + '">', 
            content, 
            count=1
        )
        with open(path, "w") as f:
            f.write(new_content)
        print(f"Updated {path} with {feature}")
    else:
        print(f"No AuthGuard found in {path}")

# Find all page.tsx files
page_files = glob.glob("src/app/**/page.tsx", recursive=True)

for path in page_files:
    # Match route path against feature mapping
    route_path = path.replace("src/app/", "").replace("/page.tsx", "")
    for prefix, feature in FEATURE_MAPPING.items():
        if route_path.startswith(prefix):
            update_file(path, feature)
            break

