using UnityEngine;
using System.Collections;

public class SelfDestruct : MonoBehaviour {

    [SerializeField]
    float seconds = 5f;
	
    void Start()
    {
        StartCoroutine("DestroyThis");
    }

    IEnumerator DestroyThis()
    {
        yield return new WaitForSeconds(seconds);
        Destroy(this.gameObject);
    }
}
