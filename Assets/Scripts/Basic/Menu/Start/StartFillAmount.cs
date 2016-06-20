using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class StartFillAmount : MonoBehaviour {

    [SerializeField]
    private Image thisImage;
    [SerializeField]
    private float _fillSpeed;

	void Update()
    {
        if (thisImage.fillAmount <= 1)
            thisImage.fillAmount += _fillSpeed;
    }
}
