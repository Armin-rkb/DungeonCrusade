using UnityEngine;
using System.Collections;

public class Arrow : MonoBehaviour
{
    private Rigidbody2D rbArrow;

    void Awake()
    {
        rbArrow = GetComponent<Rigidbody2D>();
    }

    void Start()
    {
        
    }

    void FixedUpdate()
    {
        rbArrow.velocity = new Vector2(10, rbArrow.velocity.y);
    }

    void Hit(GameObject player)
    {
        //HP moet eraf
        //Give knockback
        Rigidbody2D rb = player.GetComponent<Rigidbody2D>();
        rb.AddForce(player.transform.right * 10);
    }
    
    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            print(coll.gameObject.name);

            if (coll.gameObject.tag == "Player")
            {
                Hit(coll.gameObject);
            }
        }
            
    }
}
