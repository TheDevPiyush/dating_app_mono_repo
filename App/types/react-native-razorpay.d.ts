declare module 'react-native-razorpay' {
    interface CheckoutOptions {
        key: string;
        order_id?: string;
        subscription_id?: string;
        amount?: number;
        currency?: string;
        name?: string;
        description?: string;
        image?: string;
        prefill?: {
            name?: string;
            email?: string;
            contact?: string;
        };
        theme?: { color?: string };
        recurring?: string;
        notes?: Record<string, string>;
    }

    interface SuccessResponse {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
        razorpay_subscription_id?: string;
    }

    interface ErrorResponse {
        code: number;
        description: string;
    }

    class RazorpayCheckout {
        static open(options: CheckoutOptions): Promise<SuccessResponse>;
        static onExternalWalletSelection(callback: (data: any) => void): void;
    }

    export default RazorpayCheckout;
}
