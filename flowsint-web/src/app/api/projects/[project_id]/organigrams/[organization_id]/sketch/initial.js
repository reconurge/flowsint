import { faker } from '@faker-js/faker';

export const generateOrganigram = ({
    numDepartments = 4,
    managersPerDepartment = 3,
    employeesPerManager = 10,
} = {}) => {
    const nodes = [];
    const edges = [];
    let nodeId = 1;

    // CEO
    const ceoName = faker.person.fullName();
    nodes.push({
        id: `${nodeId}`,
        type: 'custom',
        data: {
            label: `${ceoName}\n(Chief Executive Officer)`,
            type: 'individual',
        },
        position: { x: 600, y: 0 },
    });
    const ceoId = `${nodeId}`;
    nodeId++;

    const vpIds = [];

    const departments = [
        'Engineering',
        'Sales',
        'Marketing',
        'Human Resources',
        'Product',
        'Finance',
        'Customer Success',
    ].slice(0, numDepartments);

    departments.forEach((dept, i) => {
        const vpName = faker.person.fullName();
        const vpId = `${nodeId}`;
        vpIds.push(vpId);
        nodes.push({
            id: vpId,
            type: 'custom',
            data: {
                label: `${vpName}\n(VP of ${dept})`,
                type: 'individual',
            },
            position: { x: 300 * i, y: 150 },
        });
        edges.push({
            id: `e${ceoId}-${vpId}`,
            source: ceoId,
            target: vpId,
            type: 'smoothstep',
            label: 'reports to',
        });
        nodeId++;
    });

    vpIds.forEach((vpId, i) => {
        const managerIds = [];

        for (let m = 0; m < managersPerDepartment; m++) {
            const managerId = `${nodeId}`;
            managerIds.push(managerId);
            const managerName = faker.person.fullName();

            nodes.push({
                id: managerId,
                type: 'custom',
                data: {
                    label: `${managerName}\n(Manager)`,
                    type: 'individual',
                },
                position: { x: 300 * i + m * 100 - 100, y: 300 },
            });

            edges.push({
                id: `e${vpId}-${managerId}`,
                source: vpId,
                target: managerId,
                type: 'smoothstep',
                label: 'manages',
            });

            nodeId++;
        }

        managerIds.forEach((managerId, j) => {
            for (let e = 0; e < employeesPerManager; e++) {
                const empId = `${nodeId}`;
                const empName = faker.person.fullName();
                const role = faker.person.jobTitle();
                nodes.push({
                    id: empId,
                    type: 'custom',
                    data: {
                        label: `${empName}\n(${role})`,
                        type: 'individual',
                    },
                    position: {
                        x: 300 * i + j * 100 + (e - employeesPerManager / 2) * 20,
                        y: 450,
                    },
                });
                edges.push({
                    id: `e${managerId}-${empId}`,
                    source: managerId,
                    target: empId,
                    type: 'smoothstep',
                    label: 'supervises',
                });
                nodeId++;
            }
        });
    });

    return { nodes, edges };
};
