import { Request, Response } from "express";
import { getExploreEmployees, getExploreEmployeeById } from "../services/exploreService";

export const listEmployees = async (req: Request, res: Response) => {
    try {
        const currentUserId = req.user?.user_id;
        const employees = await getExploreEmployees(currentUserId);

        const io = req.app.get("io");
        const enriched = employees.map((emp: any) => {
            let isOnline = false;
            if (io) {
                const room = io.sockets.adapter.rooms.get(`user:${emp.user_id}`);
                isOnline = !!room && room.size > 0;
            }
            return { ...emp, isOnline };
        });

        res.json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch employees" });
    }
};

export const getEmployee = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return res.status(400).json({ success: false, message: "employeeId is required" });
        }

        const employee = await getExploreEmployeeById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const io = req.app.get("io");
        let isOnline = false;
        if (io) {
            const room = io.sockets.adapter.rooms.get(`user:${employee.user_id}`);
            isOnline = !!room && room.size > 0;
        }

        res.json({ success: true, data: { ...employee, isOnline } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch employee" });
    }
};
