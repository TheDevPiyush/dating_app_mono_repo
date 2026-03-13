import { User } from "../models";
import { IUser } from "../models/User";

export const getExploreEmployees = async (excludeUserId?: string) => {
    const filter: any = {
        "girlEmployDetails.isGirlEmployee": true,
        status: "active",
        "profile.isOnboarded": true,
    };
    if (excludeUserId) {
        filter.user_id = { $ne: excludeUserId };
    }

    const employees = await User.find(filter)
        .select(
            "user_id displayName photoURL profile.firstName profile.lastName profile.bio profile.photos profile.interests profile.occupation girlEmployDetails"
        )
        .lean<IUser[]>();

    return employees;
};

export const getExploreEmployeeById = async (employeeUserId: string) => {
    const employee = await User.findOne({
        user_id: employeeUserId,
        "girlEmployDetails.isGirlEmployee": true,
        status: "active",
    })
        .select(
            "user_id displayName photoURL profile.firstName profile.lastName profile.bio profile.photos profile.interests profile.occupation profile.height profile.education girlEmployDetails"
        )
        .lean<IUser>();

    return employee;
};
