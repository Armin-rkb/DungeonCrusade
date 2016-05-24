using UnityEngine;
using System.Collections;

public class Armour : MonoBehaviour {

	void OnTriggerEnter2D(Collider2D other)
    {
        if (other.gameObject.tag == GameTags.player)
        {
            other.GetComponent<HealthPlayer>().ChangeHealth(5, false);
            Destroy(this.gameObject);
        }
            
    }
}
