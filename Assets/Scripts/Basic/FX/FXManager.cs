using UnityEngine;
using System.Collections;

public class FXManager : MonoBehaviour {


    // Bool
    [SerializeField]
    private bool _playAtStart;
    // Bool

    // GameObject
    [SerializeField]
    private GameObject[] _FXObj;
    // GameObject
    private Animation _animatorFX;

    // int
    [SerializeField]
    private int _customFXPlay;
    // int
    
    /*
     * FX INDEX
     * 0 = Smoke
     * 
     */

	void Start () 
    {
        if (_playAtStart)
            Instantiate(_FXObj[_customFXPlay], transform.position, Quaternion.identity);
	}
	
	public void PlayFX(int fx)
    {
        Instantiate(_FXObj[fx], transform.position, Quaternion.identity);
        StartCoroutine(DestroyFX(fx));
    }

    private IEnumerator DestroyFX(int fx)
    {
        yield return new WaitForSeconds(3);
        Destroy(_FXObj[fx].gameObject);
    }
}
