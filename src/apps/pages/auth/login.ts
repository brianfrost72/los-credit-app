import Router from "@router/router";

export default {
	formData: {} as Record<string, string>,
	mounted(): void {
		const form = document.querySelector("#auth-form") as HTMLElement;
		form?.addEventListener("submit", async (e) => {
			e.preventDefault();

			// Router.showLoader();

			try {
				const inputFields = form.querySelectorAll<HTMLElement>('input');
				inputFields.forEach(field => {
					const value = (field as HTMLInputElement).value.trim();
					const targetId = field.id.replace('input_', '');
					this.formData[targetId] = value;
				});

				const email = this.formData['email'] ?? this.formData['username'] ?? '';
				const password = this.formData['password'] ?? '';

				if (navigator.onLine) {
					const wentOnline = await this.attemptOnlineLogin(email, password);
					if (wentOnline) return;
				}

				await this.attemptOfflineLogin(email, password);
			} catch (err) {
				this.showFormError('An error occurred. Please try again.');
			} finally {
				// Router.hideLoader();
			}
		});

		document.addEventListener("click", (e) => {
			const button = (e.target as HTMLElement).closest("[data-toggle-password]") as HTMLButtonElement | null;

			if (!button) return;

			const input = button.parentElement?.querySelector('input[type="password"], input[type="text"]') as HTMLInputElement | null;

			if (!input) return;

			const icon = button.querySelector("i");

			if (input.type === "password") {
				input.type = "text";
				icon?.classList.replace("bi-eye", "bi-eye-slash");
			} else {
				input.type = "password";
				icon?.classList.replace("bi-eye-slash", "bi-eye");
			}
		});
	},
	async attemptOnlineLogin(email: string, password: string): Promise<boolean> {
		let result;

		try {
			result = await API.post('/auth/login', this.formData, {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (networkErr) {
			return false;
		}

		if (result.ok && result.response?.status === 'success') {
			const { payload } = result.response.data;

			Encrypt.setRawKey(payload.rawkey);
			localStorage.setItem('_x_id_', btoa('1'));

			const targetRoute = payload.next_route;
			window.location.href = targetRoute;
		}

		const { status, pesan, errors } = result.response;
		if (pesan === 'Validasi gagal') {
			this.renderFieldErrors(errors);
		} else if (status == 'failed') {
			this.showFormError(pesan ?? 'Login failed.');
		} else {
			this.showFormError(pesan ?? 'Login failed.');
		}
		return true;
	},

	async attemptOfflineLogin(email: string, password: string): Promise<void> {
		if (!email || !password) {
			this.showFormError('Email and password are required.');
			return;
		}

		const existingRawKey = await Encrypt.getRawKey();

		if (!existingRawKey) {
			this.showFormError('No internet connection, and no active login session saved in this tab.');
			return;
		}

		window.location.href = '/dashboard';
	},

	showFormError(message: string): void {
		console.warn('[Login]', message);
		swal.fire({
			icon: "error",
			title: message,
			timer: 1500,
			showConfirmButton: false,
		});
	},

	renderFieldErrors(errors: Record<string, string>): void {
		document.querySelectorAll<HTMLElement>('.is-invalid').forEach(el => {
			el.classList.remove('is-invalid');
		});

		document.querySelectorAll<HTMLElement>('.invalid-feedback').forEach(el => {
			el.remove();
		});

	Object.keys(errors).forEach(fieldName => {
		const input =
			document.querySelector(`[name="${fieldName}"]`) ||
			document.getElementById(`input_${fieldName}`);

		if (!input) return;

		input.classList.add('is-invalid');

		const feedback = document.createElement('div');
		feedback.className = 'invalid-feedback fw-semibold d-block';
		feedback.textContent = errors[fieldName];

		const wrapper = input.closest('.input-wrapper');

		if (wrapper) {
			wrapper.after(feedback);
		} else {
			input.after(feedback);
		}
	});
}
};
